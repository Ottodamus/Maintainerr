export type PlexMirrorSiteDto = {
  id: number;

  siteName: string;

  url: string;

  token: string;

  librarySectionId: string;
};

export type PlexMirrorSiteRawDto = Omit<PlexMirrorSiteDto, 'id'>;

export type PlexMirrorSiteResponseDto =
  | {
      status: 'OK';
      code: 1;
      message: string;
      data: PlexMirrorSiteDto;
    }
  | {
      status: 'NOK';
      code: 0;
      message: string;
      data?: never;
    };
