<?php

namespace App\Services\Verification;

use Illuminate\Support\Carbon;
use RuntimeException;

/**
 * Server-side POD watermark (FRD-02 FR-02-04/05): the audit metadata —
 * tracking number, capture coordinates, destination address, recipient and
 * the server timestamp — is composited into the photo pixels before the
 * object is stored, so the stamp cannot be stripped or reshaped by the
 * client.
 *
 * The canonical payload string doubles as the source of the stored
 * `watermark_hash` (FR-02-07): an auditor can recompute the digest from the
 * delivery_proofs row and compare it with the stored value.
 */
class ProofWatermark
{
    private const MAX_WIDTH = 1080;

    private const PADDING = 26;

    /**
     * Canonical watermark payload; the same string feeds the audit hash.
     */
    public function payload(
        string $tracking,
        float $latitude,
        float $longitude,
        string $address,
        string $recipient,
        Carbon $capturedAt,
    ): string {
        return implode('|', [
            $tracking,
            $this->coordinates($latitude, $longitude),
            trim($address),
            trim($recipient),
            // UTC-normalised so an audit recomputes the same digest from the
            // delivery_proofs row regardless of the stored timezone offset.
            $capturedAt->copy()->utc()->format('Y-m-d\TH:i:s\Z'),
        ]);
    }

    public function hash(
        string $tracking,
        float $latitude,
        float $longitude,
        string $address,
        string $recipient,
        Carbon $capturedAt,
    ): string {
        return hash('sha256', $this->payload($tracking, $latitude, $longitude, $address, $recipient, $capturedAt));
    }

    public function coordinates(float $latitude, float $longitude): string
    {
        return number_format($latitude, 6, '.', '').', '.number_format($longitude, 6, '.', '');
    }

    /**
     * Returns the watermarked JPEG bytes for the uploaded photo.
     */
    public function apply(
        string $binary,
        string $tracking,
        float $latitude,
        float $longitude,
        string $address,
        string $recipient,
        Carbon $capturedAt,
    ): string {
        $font = $this->fontPath();
        $source = @imagecreatefromstring($binary);

        if ($source === false) {
            throw new RuntimeException('Berkas foto POD tidak dapat dibaca sebagai gambar.');
        }

        $image = $this->flatten($source);
        imagedestroy($source);

        try {
            $image = $this->scaleToFit($image);
            $width = imagesx($image);
            $height = imagesy($image);

            $fontSize = max(15, (int) round($width / 40));
            $lineHeight = (int) ceil($fontSize * 1.5);
            $lines = $this->lines($font, $fontSize, $width, $tracking, $latitude, $longitude, $address, $recipient, $capturedAt);

            $panelHeight = count($lines) * $lineHeight + self::PADDING * 2;
            $panel = imagecolorallocatealpha($image, 10, 12, 16, 30);
            imagefilledrectangle($image, 0, max(0, $height - $panelHeight), $width, $height, $panel);

            $primary = imagecolorallocate($image, 255, 255, 255);
            $secondary = imagecolorallocate($image, 222, 226, 230);

            $y = $height - $panelHeight + self::PADDING + $fontSize;
            foreach ($lines as $index => $line) {
                imagettftext($image, $fontSize, 0, self::PADDING, $y, $index === 0 ? $primary : $secondary, $font, $line);
                $y += $lineHeight;
            }

            ob_start();
            imagejpeg($image, null, 86);
            $jpeg = (string) ob_get_clean();

            return $jpeg;
        } finally {
            imagedestroy($image);
        }
    }

    /**
     * @return array<int, string>
     */
    private function lines(
        string $font,
        int $fontSize,
        int $width,
        string $tracking,
        float $latitude,
        float $longitude,
        string $address,
        string $recipient,
        Carbon $capturedAt,
    ): array {
        $maxTextWidth = $width - self::PADDING * 2;

        $lines = [
            'POD '.$tracking.' • Anteraja Instant',
            'Koordinat: '.$this->coordinates($latitude, $longitude),
            ...$this->wrap($font, $fontSize, $maxTextWidth, $address),
            'Penerima: '.$recipient,
            'Waktu server: '.$capturedAt->format('d/m/Y H:i:s').' WIB',
        ];

        return $lines;
    }

    /**
     * Greedy word wrap measured with the actual TTF metrics, capped at three
     * lines so the watermark never swallows the photo.
     *
     * @return array<int, string>
     */
    private function wrap(string $font, int $size, int $maxWidth, string $text): array
    {
        $words = preg_split('/\s+/u', trim($text)) ?: [];
        $words = array_values(array_filter($words, static fn ($word) => $word !== ''));

        if ($words === []) {
            return [];
        }

        $lines = [];
        $current = '';
        $truncated = false;

        foreach ($words as $word) {
            $candidate = $current === '' ? $word : $current.' '.$word;

            if ($current === '' || $this->textWidth($font, $size, $candidate) <= $maxWidth) {
                $current = $candidate;

                continue;
            }

            $lines[] = $current;
            $current = $word;

            if (count($lines) === 3) {
                $truncated = true;
                break;
            }
        }

        if ($current !== '') {
            if (count($lines) < 3) {
                $lines[] = $current;
            } else {
                $truncated = true;
            }
        }

        if ($truncated && $lines !== []) {
            $last = array_pop($lines);
            $lines[] = rtrim($this->truncateToWidth($font, $size, $last.' …', $maxWidth));
        }

        return $lines;
    }

    private function truncateToWidth(string $font, int $size, string $text, int $maxWidth): string
    {
        while ($text !== '' && $this->textWidth($font, $size, $text) > $maxWidth) {
            $text = mb_substr($text, 0, max(0, mb_strlen($text) - 2));
        }

        return $text;
    }

    private function textWidth(string $font, int $size, string $text): int
    {
        $box = imagettfbbox($size, 0, $font, $text);

        if ($box === false) {
            return 0;
        }

        return max($box[2], $box[4]) - min($box[0], $box[6]);
    }

    /**
     * Normalises PNG/WebP sources onto an opaque truecolor canvas so the
     * JPEG output never turns transparency into black.
     *
     * @param  \GdImage  $source
     * @return \GdImage
     */
    private function flatten($source)
    {
        $width = imagesx($source);
        $height = imagesy($source);

        $canvas = imagecreatetruecolor($width, $height);
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 12, 14, 18));
        imagecopy($canvas, $source, 0, 0, 0, 0, $width, $height);

        return $canvas;
    }

    /**
     * @param  \GdImage  $image
     * @return \GdImage
     */
    private function scaleToFit($image)
    {
        $width = imagesx($image);

        if ($width <= self::MAX_WIDTH) {
            return $image;
        }

        $scaled = imagescale($image, self::MAX_WIDTH, -1, IMG_BILINEAR_FIXED);

        if ($scaled === false) {
            return $image;
        }

        imagedestroy($image);

        return $scaled;
    }

    private function fontPath(): string
    {
        $path = resource_path('fonts/PlusJakartaSans.ttf');

        if (! is_file($path)) {
            throw new RuntimeException('Font watermark POD tidak ditemukan: '.$path);
        }

        return $path;
    }
}
