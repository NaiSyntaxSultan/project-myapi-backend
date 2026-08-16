import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateBatchDto {
  @ApiProperty({ example: 'AV-44291' })
  @IsString()
  @IsNotEmpty()
  smear_id: string;

  @ApiProperty({ example: 'Laying hen' })
  @IsString()
  @IsNotEmpty()
  chicken_type: string;

  @ApiProperty({ example: 'Nakhon Si Thammarat' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: 12, description: 'age week' })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  age: number;

  @ApiProperty({ example: 'Hen', enum: ['Rooster', 'Hen'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['Rooster', 'Hen'])
  sex: string;

  @ApiProperty({ example: 'Giemsa' })
  @IsString()
  @IsNotEmpty()
  stain_type: string;

  @ApiProperty({ example: 'ไก่มีอาการซึม', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    isArray: true,
    description: 'อัปโหลดรูปภาพเม็ดเลือดไก่ (เลือกได้สูงสุด 100 ไฟล์)',
  })
  files: any[];
}
