<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The courier records who received the parcel; the audit trail shows
        // the actual value instead of a canned label.
        Schema::table('delivery_proofs', function (Blueprint $table) {
            $table->string('relation')->nullable()->after('recipient_name');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_proofs', function (Blueprint $table) {
            $table->dropColumn('relation');
        });
    }
};
