import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSiteDto {
  @ApiProperty({ required: false, example: 'My Marketing Site' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ example: 'https://example.com' })
  @IsUrl({ require_tld: false })
  url: string;
}

export class UpdateSiteDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false })
  @IsUrl({ require_tld: false })
  @IsOptional()
  url?: string;

  @ApiProperty({
    required: false,
    description:
      'GA4 property in the form "properties/123456789", or null to unlink.',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  gaPropertyId?: string | null;
}
