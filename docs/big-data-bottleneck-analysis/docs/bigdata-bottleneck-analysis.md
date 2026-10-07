# Day 18 - Big Data Fundamentals: Delivery Bottleneck Hubs

**Program:** Capstone Anteraja - Minggu 4 (Data)
**Branch:** feature/bigdata-bottleneck-hubs
**Engine:** PySpark 3.5 (Apache Spark, dijalankan di Google Colab atau lokal dengan JDK 17)

Analisis ini menjawab pertanyaan: **hub mana yang memiliki dwell time tertinggi dan perlu
diinvestigasi lebih lanjut?** Alurnya tetap mengikuti pola SQL yang sudah dipelajari -
**filter -> group -> aggregate -> sort** - hanya mesinnya yang berubah dari satu proses menjadi
komputasi terdistribusi.

## 1. Dataset & schema

Dataset simulasi ```scan_events``` dibuat oleh fungsi ```generate_scan_events()``` di notebook
dengan seed tetap (42), jadi hasilnya deterministik dan bisa diregenerasi kapan saja.
Setiap paket melewati 1-3 hub, dan setiap kunjungan menghasilkan pasangan event ARRIVAL lalu
DEPARTURE. Dataset sengaja dibuat "kotor" agar pemeriksaan kualitas benar-benar teruji.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| hub_id | string | Kode hub, contoh HUB_MKS |
| package_id | string | Kode paket, contoh PKG000123 |
| event_type | string | ARRIVAL atau DEPARTURE |
| timestamp | string | Waktu scan, format yyyy-MM-dd HH:mm:ss (sebagian rusak) |

Ukuran dataset yang dipakai:

| Metrik | Nilai |
| --- | --- |
| Total event | 45.542 |
| Hub unik | 12 |
| Paket unik | 13.494 |
| Jenis event | ARRIVAL, DEPARTURE |

Dalam kerangka **5 Vs of Big Data**, dataset ini mewakili **Volume** (puluhan ribu event, dan ini
baru satu irisan waktu), **Velocity** (scan masuk terus-menerus dari tiap hub), **Variety**
(event, timestamp, dan nantinya data hub/SLA), **Veracity** (cacat data nyata seperti scan hilang
dan duplikat), serta **Value** (menemukan hub bottleneck). **Pandas** tidak cocok untuk skala
produksi karena seluruh data harus masuk ke RAM satu mesin dan hanya berjalan di satu core,
sehingga Spark dengan partisi paralel menjadi pilihan.

## 2. Data quality check

Sebelum dwell time dihitung, pasangan scan diperiksa lebih dulu:

| Pemeriksaan | Jumlah | Rasio |
| --- | --- | --- |
| Total event mentah | 45.542 | 100% |
| Timestamp tidak valid (gagal di-parse) | 412 | 0,90% |
| Scan duplikat (baris identik) | 881 | - |
| Pasangan package x hub | 22.991 | 100% |
| Missing ARRIVAL | 885 | 3,85% |
| Missing DEPARTURE | 848 | 3,69% |
| DEPARTURE <= ARRIVAL | 222 | 0,97% |
| Pasangan valid dipakai | 21.036 | 91,50% |

Langkah pembersihannya: parse timestamp (```to_timestamp```), buang timestamp NULL, hapus
duplikat dengan ```dropDuplicates```, lalu buang pasangan yang tidak punya ARRIVAL atau DEPARTURE
atau yang DEPARTURE-nya tidak setelah ARRIVAL. Hanya 21.036 pasangan valid yang dipakai untuk
analisis berikutnya, sehingga insight tidak dibangun dari event cacat.

## 3. Query/kode PySpark

Setup SparkSession:

```python
spark = (
    SparkSession.builder
    .master("local[*]")
    .appName("day18-bottleneck-hubs")
    .config("spark.sql.shuffle.partitions", "8")
    .getOrCreate()
)
```

Data quality check (timestamp invalid dan duplikat):

```python
parsed = raw.withColumn("ts", F.to_timestamp("timestamp", "yyyy-MM-dd HH:mm:ss"))
invalid_ts = parsed.filter(F.col("ts").isNull()).count()

with_ts = parsed.filter(F.col("ts").isNotNull())
deduped = with_ts.dropDuplicates(["hub_id", "package_id", "event_type", "ts"])
```

Pairing ARRIVAL -> DEPARTURE dan dwell time:

```python
grouped = (
    deduped.groupBy("hub_id", "package_id")
    .agg(
        F.sum(F.when(F.col("event_type") == "ARRIVAL", 1).otherwise(0)).alias("n_arrival"),
        F.sum(F.when(F.col("event_type") == "DEPARTURE", 1).otherwise(0)).alias("n_departure"),
        F.min(F.when(F.col("event_type") == "ARRIVAL", F.col("ts"))).alias("first_arrival"),
        F.max(F.when(F.col("event_type") == "DEPARTURE", F.col("ts"))).alias("last_departure"),
    )
)
```

Group, aggregate, dan sort per hub:

```python
hub_dwell = spark.sql("""
    SELECT
        hub_id,
        COUNT(*) AS package_count,
        AVG(dwell_hours) AS avg_dwell_hours,
        percentile_approx(dwell_hours, 0.5) AS median_dwell_hours
    FROM valid_pairs
    GROUP BY hub_id
    ORDER BY avg_dwell_hours DESC
""")
```

Padanan DataFrame API: ```groupBy("hub_id").agg(F.count("*"), F.avg("dwell_hours"),
F.expr("percentile_approx(dwell_hours, 0.5)"))``` lalu ```orderBy(F.desc("avg_dwell_hours"))```.

## 4. Hasil perhitungan dwell time

Dwell time = (DEPARTURE - ARRIVAL) dalam jam, dihitung per pasangan package x hub lalu
diagregasi per hub (diurutkan dari average tertinggi):

| hub_id | package_count | avg_dwell_hours | median_dwell_hours |
| --- | --- | --- | --- |
| HUB_AMB | 36 | 12,32 | 11,71 |
| HUB_MKS | 1.928 | 10,70 | 10,30 |
| HUB_DPS | 1.580 | 9,48 | 9,16 |
| HUB_MDN | 1.702 | 8,96 | 8,59 |
| HUB_BJM | 1.096 | 8,38 | 8,20 |
| HUB_PLM | 1.349 | 7,82 | 7,56 |
| HUB_PDG | 1.357 | 7,34 | 7,17 |
| HUB_SBY | 2.545 | 6,59 | 6,37 |
| HUB_JOG | 1.969 | 6,24 | 6,05 |
| HUB_SMG | 2.197 | 6,01 | 5,79 |
| HUB_BDG | 2.324 | 5,33 | 5,18 |
| HUB_CGK | 2.953 | 4,62 | 4,46 |

Rata-rata keseluruhan: 7,10 jam.

## 5. Top 3-5 bottleneck hubs

Ranking memakai ambang volume minimum **100 paket** per hub supaya hub kecil tidak otomatis
masuk prioritas, dan median dibandingkan agar bukan efek segelintir paket ekstrem.

| hub_id | package_count | avg_dwell_hours | median_dwell_hours |
| --- | --- | --- | --- |
| HUB_MKS | 1.928 | 10,70 | 10,30 |
| HUB_DPS | 1.580 | 9,48 | 9,16 |
| HUB_MDN | 1.702 | 8,96 | 8,59 |
| HUB_BJM | 1.096 | 8,38 | 8,20 |
| HUB_PLM | 1.349 | 7,82 | 7,56 |

**HUB_AMB** dikecualikan dari prioritas: average-nya tertinggi (12,32 jam) tetapi hanya 36 paket
valid, sehingga belum cukup bukti untuk menetapkannya sebagai bottleneck utama. Hasil ini
disimpan di ```output/top_bottleneck_hubs.csv```.

## 6. Business insight & rekomendasi investigasi

HUB_MKS adalah bottleneck terbesar: average dwell time 10,70 jam dan median 10,30 jam dari
1.928 paket valid, jauh di atas rata-rata keseluruhan 7,10 jam, dan karena average serta
median-nya berdekatan masalahnya merata, bukan efek beberapa paket ekstrem. HUB_DPS (9,48 / 9,16
jam) dan HUB_MDN (8,96 / 8,59 jam) menyusul dengan pola yang sama, disusul HUB_BJM dan HUB_PLM.
Sebelum menetapkan prioritas, tim juga perlu tahu bahwa kualitas scan belum sempurna: 3,85%
pasangan kehilangan ARRIVAL, 3,69% kehilangan DEPARTURE, 0,97% punya DEPARTURE <= ARRIVAL, 412
event bertimestamp rusak, dan 881 scan duplikat, sehingga 2.955 dari 22.991 pasangan (9,5%)
harus dibuang.

Rekomendasi untuk tim operasional:

1. Prioritaskan audit alur ARRIVAL-DEPARTURE dan kapasitas sorting di **HUB_MKS**, disusul
   **HUB_DPS** dan **HUB_MDN**.
2. Periksa jumlah dock/gate, pola shift pada jam sibuk, dan proses antrean inbound/outbound.
3. Cek konsistensi pencatatan scan: dwell yang panjang bisa berasal dari DEPARTURE yang
   tercatat terlambat, bukan paket yang benar-benar mengendap.
4. Perbaiki kualitas scan (setiap paket wajib punya ARRIVAL dan DEPARTURE valid) sebelum
   menetapkan SLA per hub, karena 9,5% pasangan saat ini belum bisa dipakai.
5. Pantau ulang metric ini secara berkala memakai Spark agar tren per hub terlihat.

