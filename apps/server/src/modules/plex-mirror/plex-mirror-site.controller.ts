import { plexMirrorSiteSettingSchema } from '@maintainerr/contracts';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  PlexMirrorSiteDto,
  PlexMirrorSiteRawDto,
} from "./dto's/plex-mirror-site.dto";
import { PlexMirrorSiteService } from './plex-mirror-site.service';

@Controller('api/settings/plex-mirror')
export class PlexMirrorSiteController {
  constructor(private readonly plexMirrorSiteService: PlexMirrorSiteService) {}

  @Get()
  getAll() {
    return this.plexMirrorSiteService.getAll();
  }

  @Post('/test')
  testConnection(
    @Body(
      new ZodValidationPipe(
        plexMirrorSiteSettingSchema.pick({ url: true, token: true }),
      ),
    )
    payload: Pick<PlexMirrorSiteRawDto, 'url' | 'token'>,
  ) {
    return this.plexMirrorSiteService.testConnection(payload);
  }

  @Post()
  add(
    @Body(new ZodValidationPipe(plexMirrorSiteSettingSchema))
    payload: PlexMirrorSiteRawDto,
  ) {
    return this.plexMirrorSiteService.add(payload);
  }

  @Put('/:id')
  update(
    @Param('id', new ParseIntPipe()) id: number,
    @Body(new ZodValidationPipe(plexMirrorSiteSettingSchema))
    payload: PlexMirrorSiteRawDto,
  ) {
    const data: PlexMirrorSiteDto = { id, ...payload };
    return this.plexMirrorSiteService.update(data);
  }

  @Delete('/:id')
  delete(@Param('id', new ParseIntPipe()) id: number) {
    return this.plexMirrorSiteService.delete(id);
  }
}
