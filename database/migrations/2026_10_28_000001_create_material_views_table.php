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
        // Read in the teacher's browser on upload, so the server knows when a video was watched to the end.
        Schema::table('materials', function (Blueprint $table): void {
            $table->unsignedInteger('duration_seconds')->nullable()->after('size');
        });

        // How far each student got in each material. Evaluations open once every material is completed.
        Schema::create('material_views', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('material_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('seconds_watched')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['material_id', 'student_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('material_views');

        Schema::table('materials', function (Blueprint $table): void {
            $table->dropColumn('duration_seconds');
        });
    }
};
