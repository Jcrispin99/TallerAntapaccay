<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table): void {
            $table->id();
            $table->string('dni', 20)->unique();
            $table->string('full_name');
            $table->string('gerencia')->nullable()->index();
            $table->string('puesto')->nullable();
            $table->timestamps();
        });

        // Attempts keep a copy of the student's data as it was when they took the evaluation.
        Schema::table('attempts', function (Blueprint $table): void {
            $table->foreignId('student_id')->nullable()->after('evaluation_id')->constrained()->nullOnDelete();
            $table->string('gerencia')->nullable()->after('full_name');
            $table->string('puesto')->nullable()->after('gerencia');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attempts', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('student_id');
            $table->dropColumn(['gerencia', 'puesto']);
        });

        Schema::dropIfExists('students');
    }
};
