<?php

namespace App\Services\Radius;

use App\Models\Admin;
use App\Models\AdminAction;
use App\Models\GeofencePolicy;
use App\Support\Date;

/**
 * Geofence radius policy per service segment (FR-01-02 / admin console).
 */
class RadiusService
{
    /**
     * @var array<string, array{id: string, label: string, icon: string, sla: string, description: string, min: int, max: int, step: int, fallback: int, accent: array<string, string>, persist: bool}>
     */
    private const SEGMENTS = [
        'instant' => [
            'id' => 'radius-instant',
            'label' => 'Anteraja Instant',
            'icon' => 'bolt',
            'sla' => 'SLA 2-3 Jam',
            'description' => 'Validasi toleransi GPS langsung di titik koordinat penerima.',
            'min' => 10, 'max' => 100, 'step' => 5, 'fallback' => 30, 'persist' => true,
            'accent' => [
                'iconBg' => 'bg-brand-magenta/10', 'iconText' => 'text-brand-magenta',
                'slaBg' => 'bg-brand-magenta/10', 'slaText' => 'text-brand-magenta',
                'input' => 'text-brand-magenta',
            ],
        ],
        'same_day' => [
            'id' => 'radius-sameday',
            'label' => 'Anteraja Same-Day',
            'icon' => 'schedule',
            'sla' => 'SLA 6-8 Jam',
            'description' => 'Toleransi area metropolitan untuk akses gerbang, lobi gedung, atau satpam cluster.',
            'min' => 20, 'max' => 200, 'step' => 5, 'fallback' => 50, 'persist' => true,
            'accent' => [
                'iconBg' => 'bg-secondary-fixed/50', 'iconText' => 'text-amber-600',
                'slaBg' => 'bg-secondary-fixed/60', 'slaText' => 'text-amber-700',
                'input' => 'text-amber-600',
            ],
        ],
        'regular' => [
            'id' => 'radius-reguler',
            'label' => 'Anteraja Reguler',
            'icon' => 'local_shipping',
            'sla' => 'SLA 1-2 Hari',
            'description' => 'Batas toleransi standar drop-off alamat penerima atau pos lingkungan.',
            'min' => 25, 'max' => 500, 'step' => 10, 'fallback' => 100, 'persist' => true,
            'accent' => [
                'iconBg' => 'bg-tertiary-fixed/50', 'iconText' => 'text-emerald-600',
                'slaBg' => 'bg-tertiary-fixed/50', 'slaText' => 'text-emerald-700',
                'input' => 'text-emerald-600',
            ],
        ],
        'kargo' => [
            'id' => 'radius-kargo',
            'label' => 'Anteraja Kargo',
            'icon' => 'inventory_2',
            'sla' => 'SLA Bulk',
            'description' => 'Toleransi drop-off area pergudangan, loading dock, atau ruko.',
            'min' => 50, 'max' => 1000, 'step' => 10, 'fallback' => 150, 'persist' => false,
            'accent' => [
                'iconBg' => 'bg-purple-50', 'iconText' => 'text-purple-600',
                'slaBg' => 'bg-purple-100/80', 'slaText' => 'text-purple-700',
                'input' => 'text-purple-600',
            ],
        ],
    ];

    /**
     * @return array<int, array<string, mixed>>
     */
    public function segments(): array
    {
        $policies = GeofencePolicy::all()->keyBy('service_type');

        return collect(self::SEGMENTS)->map(function (array $segment, string $type) use ($policies) {
            $policy = $policies->get($type);

            return [
                'id' => $segment['id'],
                'label' => $segment['label'],
                'icon' => $segment['icon'],
                'sla' => $segment['sla'],
                'description' => $segment['description'],
                'min' => $segment['min'],
                'max' => $segment['max'],
                'step' => $segment['step'],
                'defaultValue' => $policy?->default_radius_m ?? $segment['fallback'],
                'accent' => $segment['accent'],
            ];
        })->values()->all();
    }

    /**
     * @return array{protocol: string, updatedBy: string, updatedAtIso: string|null, updatedAtLabel: string}
     */
    public function meta(): array
    {
        $policy = GeofencePolicy::orderBy('updated_at')->first();
        $action = AdminAction::where('action_type', 'update_radius')
            ->with('admin')
            ->orderByDesc('created_at')
            ->first();

        $updatedAt = $action?->created_at ?? $policy?->updated_at;

        return [
            'protocol' => $policy?->protocol_version ?? 'Fleet Safety Protocol',
            'updatedBy' => $action?->admin?->name ?? 'Superadmin',
            'updatedAtIso' => Date::iso($updatedAt),
            'updatedAtLabel' => Date::dateTimeLabel($updatedAt),
        ];
    }

    public function update(string $serviceType, int $radiusM, Admin $admin): GeofencePolicy
    {
        $policy = GeofencePolicy::where('service_type', $serviceType)->firstOrFail();

        $policy->update([
            'default_radius_m' => $radiusM,
            'updated_by' => $admin->id,
        ]);

        AdminAction::create([
            'admin_id' => $admin->id,
            'action_type' => 'update_radius',
            'target_type' => 'geofence_policy',
            'target_id' => $policy->id,
            'reason' => sprintf('Radius %s diubah menjadi %d m', $serviceType, $radiusM),
        ]);

        return $policy;
    }
}
