<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('courier');
            $table->uuid('courier_id')->nullable()->unique();
            $table->uuid('admin_id')->nullable()->unique();

            $table->foreign('courier_id')->references('id')->on('couriers')->nullOnDelete();
            $table->foreign('admin_id')->references('id')->on('admins')->nullOnDelete();

            $table->index('role');
        });

        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('courier', 'admin'))");
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_actor_check CHECK ((courier_id IS NULL) <> (admin_id IS NULL))');
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['courier_id']);
            $table->dropForeign(['admin_id']);
            $table->dropUnique(['courier_id']);
            $table->dropUnique(['admin_id']);
            $table->dropIndex(['role']);
            $table->dropColumn(['role', 'courier_id', 'admin_id']);
        });
    }
};
