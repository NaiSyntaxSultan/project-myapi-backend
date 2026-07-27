import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smear_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chicken_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stain_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1, description: 'เลขหน้าของกลุ่ม Completed' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  completedPage?: number = 1;

  @ApiPropertyOptional({ default: 1, description: 'เลขหน้าของกลุ่ม Pending' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pendingPage?: number = 1;

  @ApiPropertyOptional({ default: 1, description: 'เลขหน้าของกลุ่ม Suspended' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  suspendedPage?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}