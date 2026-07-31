import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'สมชาย', description: 'ชื่อจริงของสัตวแพทย์' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter your first name.' })
  first_name: string;

  @ApiProperty({ example: 'ไข่แลน', description: 'นามสกุล' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter your last name.' })
  last_name: string;

  @ApiProperty({ example: 'somchai.vet@example.com', description: 'อีเมลที่ใช้สำหรับเข้าสู่ระบบและติดต่อ' })
  @IsEmail({}, { message: 'Invalid email address.' })
  email: string;

  @ApiProperty({ example: 'StrongP@ss123', description: 'รหัสผ่าน (อย่างน้อย 8 ตัวอักษร ต้องมีพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ)' })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/, { 
    message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' 
  })
  password: string;

  @ApiProperty({ example: 'StrongP@ss123', description: 'ยืนยันรหัสผ่าน (ต้องตรงกับช่อง password)' })
  @IsString()
  @IsNotEmpty({ message: 'Please confirm your password.' })
  confirmPassword: string;

  @ApiProperty({ example: 'VET-12345', description: 'เลขที่ใบประกอบวิชาชีพสัตวแพทย์' })
  @IsString()
  @IsNotEmpty({ message: 'Veterinary license number is required.' })
  veterinary_license: string;
}
