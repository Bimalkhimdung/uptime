import {
  IsUrl,
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMonitorDto {
  @ApiProperty({ example: 'My Website' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://example.com' })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiProperty({ example: 5, description: 'Interval in minutes (1, 5, 10, 15, 30, 60)' })
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  interval?: number = 5;

  @ApiProperty({ example: 10, description: 'Timeout in seconds' })
  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  timeout?: number = 10;

  @ApiProperty({ required: false, example: 'alerts@mycompany.com' })
  @IsString()
  @IsOptional()
  alertEmail?: string;
}

export class UpdateMonitorDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsUrl({ require_tld: false })
  @IsOptional()
  url?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  interval?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  timeout?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
