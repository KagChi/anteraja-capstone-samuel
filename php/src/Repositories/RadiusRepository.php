<?php

declare(strict_types=1);

namespace Anteraja\Repositories;

/**
 * Sumber data kebijakan radius geofence per segmen layanan.
 */
final class RadiusRepository
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function segments(): array
    {
        return [
            [
                'id' => 'radius-instant',
                'label' => 'Anteraja Instant',
                'icon' => 'bolt',
                'sla' => 'SLA 2-3 Jam',
                'description' => 'Validasi toleransi GPS langsung di titik koordinat penerima.',
                'min' => 10,
                'max' => 100,
                'step' => 5,
                'defaultValue' => 30,
                'accent' => [
                    'iconBg' => 'bg-brand-magenta/10',
                    'iconText' => 'text-brand-magenta',
                    'slaBg' => 'bg-brand-magenta/10',
                    'slaText' => 'text-brand-magenta',
                    'input' => 'text-brand-magenta',
                ],
            ],
            [
                'id' => 'radius-sameday',
                'label' => 'Anteraja Same-Day',
                'icon' => 'schedule',
                'sla' => 'SLA 6-8 Jam',
                'description' => 'Toleransi area metropolitan untuk akses gerbang, lobi gedung, atau satpam cluster.',
                'min' => 20,
                'max' => 200,
                'step' => 5,
                'defaultValue' => 50,
                'accent' => [
                    'iconBg' => 'bg-secondary-fixed/50',
                    'iconText' => 'text-amber-600',
                    'slaBg' => 'bg-secondary-fixed/60',
                    'slaText' => 'text-amber-700',
                    'input' => 'text-amber-600',
                ],
            ],
            [
                'id' => 'radius-reguler',
                'label' => 'Anteraja Reguler',
                'icon' => 'local_shipping',
                'sla' => 'SLA 1-2 Hari',
                'description' => 'Batas toleransi standar drop-off alamat penerima atau pos lingkungan.',
                'min' => 25,
                'max' => 500,
                'step' => 10,
                'defaultValue' => 100,
                'accent' => [
                    'iconBg' => 'bg-tertiary-fixed/50',
                    'iconText' => 'text-emerald-600',
                    'slaBg' => 'bg-tertiary-fixed/50',
                    'slaText' => 'text-emerald-700',
                    'input' => 'text-emerald-600',
                ],
            ],
            [
                'id' => 'radius-kargo',
                'label' => 'Anteraja Kargo',
                'icon' => 'inventory_2',
                'sla' => 'SLA Bulk',
                'description' => 'Toleransi drop-off area pergudangan, loading dock, atau ruko.',
                'min' => 50,
                'max' => 1000,
                'step' => 10,
                'defaultValue' => 150,
                'accent' => [
                    'iconBg' => 'bg-purple-50',
                    'iconText' => 'text-purple-600',
                    'slaBg' => 'bg-purple-100/80',
                    'slaText' => 'text-purple-700',
                    'input' => 'text-purple-600',
                ],
            ],
        ];
    }

    /**
     * Meta kebijakan radius (protokol & jejak pembaruan).
     *
     * @return array<string, string>
     */
    public function meta(): array
    {
        return [
            'protocol' => 'Fleet Safety Protocol v4.2',
            'updatedBy' => 'Superadmin (Dimas P.)',
            'updatedAtIso' => '2024-09-12T09:15:00+07:00',
            'updatedAtLabel' => '12 Sep 2024, 09:15 WIB',
        ];
    }
}
