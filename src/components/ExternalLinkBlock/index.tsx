import EmbyLogo from '@app/assets/services/emby.svg';
import JellyfinLogo from '@app/assets/services/jellyfin.svg';
import PlexLogo from '@app/assets/services/plex.svg';
import useLocale from '@app/hooks/useLocale';
import useSettings from '@app/hooks/useSettings';
import { MediaType } from '@server/constants/media';
import { MediaServerType } from '@server/constants/server';

interface ExternalLinkBlockProps {
  mediaUrl?: string;
}

const ExternalLinkBlock = ({ mediaUrl }: ExternalLinkBlockProps) => {
  const settings = useSettings();
  const { locale } = useLocale();
  return (
    <div className="flex w-full items-center justify-center">
      {mediaUrl && (
        <a
          href={mediaUrl}
          className="w-12 opacity-50 transition duration-300 hover:opacity-100"
          target="_blank"
          rel="noreferrer"
        >
          {settings.currentSettings.mediaServerType === MediaServerType.PLEX ? (
            <PlexLogo />
          ) : settings.currentSettings.mediaServerType ===
            MediaServerType.EMBY ? (
            <EmbyLogo />
          ) : (
            <JellyfinLogo />
          )}
        </a>
      )}
    </div>
  );
};

export default ExternalLinkBlock;
