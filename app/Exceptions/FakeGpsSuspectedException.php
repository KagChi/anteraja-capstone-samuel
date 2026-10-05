<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when the server blocks a POD/completion attempt on strong fake-GPS
 * evidence and no admin override covers the shipment (FRD-06).
 */
class FakeGpsSuspectedException extends RuntimeException
{
    /**
     * @param  list<array{code: string, label: string, detail: string, severity: string}>  $reasons
     */
    public function __construct(private readonly array $reasons)
    {
        parent::__construct(
            'Lokasi perangkat terdeteksi tidak wajar (indikasi GPS palsu). Matikan aplikasi lokasi palsu lalu coba lagi, atau minta peninjauan Admin.'
        );
    }

    /**
     * @return list<array{code: string, label: string, detail: string, severity: string}>
     */
    public function reasons(): array
    {
        return $this->reasons;
    }
}
