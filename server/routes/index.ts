import GithubAPI from '@server/api/github';
import PushoverAPI from '@server/api/pushover';

import { getRepository } from '@server/datasource';
import DiscoverSlider from '@server/entity/DiscoverSlider';
import type { StatusResponse } from '@server/interfaces/api/settingsInterfaces';
import { Permission } from '@server/lib/permissions';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { checkUser, isAuthenticated } from '@server/middleware/auth';
import { mapWatchProviderDetails } from '@server/models/common';
// Movie/TV helpers removed for music-only fork
import overrideRuleRoutes from '@server/routes/overrideRule';
import settingsRoutes from '@server/routes/settings';
import watchlistRoutes from '@server/routes/watchlist';
import {
  appDataPath,
  appDataPermissions,
  appDataStatus,
} from '@server/utils/appDataVolume';
import { getAppVersion, getCommitTag } from '@server/utils/appVersion';
import restartFlag from '@server/utils/restartFlag';
import { isPerson } from '@server/utils/typeHelpers';
import { Router } from 'express';
import artistRoutes from './artist';
import authRoutes from './auth';
import blacklistRoutes from './blacklist';
import collectionRoutes from './collection';
import coverArtRoutes from './coverart';
import discoverRoutes, { createTmdbWithRegionLanguage } from './discover';
import issueRoutes from './issue';
import issueCommentRoutes from './issueComment';
import mediaRoutes from './media';
// movieRoutes removed for music-only fork
import musicRoutes from './music';
import personRoutes from './person';
import requestRoutes from './request';
import searchRoutes from './search';
import serviceRoutes from './service';
// tvRoutes removed for music-only fork
import user from './user';

const router = Router();

router.use(checkUser);

router.get<unknown, StatusResponse>('/status', async (req, res) => {
  const githubApi = new GithubAPI();

  const currentVersion = getAppVersion();
  const commitTag = getCommitTag();
  let updateAvailable = false;
  let commitsBehind = 0;

  if (currentVersion.startsWith('develop-') && commitTag !== 'local') {
    const commits = await githubApi.getSeerrCommits();

    if (commits.length) {
      const filteredCommits = commits.filter(
        (commit) => !commit.commit.message.includes('[skip ci]')
      );
      if (filteredCommits[0].sha !== commitTag) {
        updateAvailable = true;
      }

      const commitIndex = filteredCommits.findIndex(
        (commit) => commit.sha === commitTag
      );

      if (updateAvailable) {
        commitsBehind = commitIndex;
      }
    }
  } else if (commitTag !== 'local') {
    const releases = await githubApi.getSeerrReleases();

    if (releases.length) {
      const latestVersion = releases[0];

      if (!latestVersion.name.includes(currentVersion)) {
        updateAvailable = true;
      }
    }
  }

  return res.status(200).json({
    version: getAppVersion(),
    commitTag: getCommitTag(),
    updateAvailable,
    commitsBehind,
    restartRequired: restartFlag.isSet(),
  });
});

router.get('/status/appdata', (_req, res) => {
  return res.status(200).json({
    appData: appDataStatus(),
    appDataPath: appDataPath(),
    appDataPermissions: appDataPermissions(),
  });
});

router.use('/user', isAuthenticated(), user);
router.get('/settings/public', async (req, res) => {
  const settings = getSettings();

  if (!(req.user?.settings?.notificationTypes.webpush ?? true)) {
    return res
      .status(200)
      .json({ ...settings.fullPublicSettings, enablePushRegistration: false });
  } else {
    return res.status(200).json(settings.fullPublicSettings);
  }
});
router.get('/settings/discover', isAuthenticated(), async (_req, res) => {
  const sliderRepository = getRepository(DiscoverSlider);

  const sliders = await sliderRepository.find({ order: { order: 'ASC' } });

  return res.json(sliders);
});
router.get(
  '/settings/notifications/pushover/sounds',
  isAuthenticated(),
  async (req, res, next) => {
    const pushoverApi = new PushoverAPI();

    try {
      if (!req.query.token) {
        throw new Error('Pushover application token missing from request');
      }

      const sounds = await pushoverApi.getSounds(req.query.token as string);
      res.status(200).json(sounds);
    } catch (e) {
      logger.debug('Something went wrong retrieving Pushover sounds', {
        label: 'API',
        errorMessage: e.message,
      });
      return next({
        status: 500,
        message: 'Unable to retrieve Pushover sounds.',
      });
    }
  }
);
router.use('/settings', isAuthenticated(Permission.ADMIN), settingsRoutes);
router.use('/search', isAuthenticated(), searchRoutes);
router.use('/discover', isAuthenticated(), discoverRoutes);
router.use('/request', isAuthenticated(), requestRoutes);
router.use('/watchlist', isAuthenticated(), watchlistRoutes);
router.use('/blacklist', isAuthenticated(), blacklistRoutes);
// Movie and TV routes removed for music-only fork
router.use('/music', isAuthenticated(), musicRoutes);
router.use('/media', isAuthenticated(), mediaRoutes);
router.use('/person', isAuthenticated(), personRoutes);
router.use('/artist', isAuthenticated(), artistRoutes);
router.use('/collection', isAuthenticated(), collectionRoutes);
router.use('/service', isAuthenticated(), serviceRoutes);
router.use('/issue', isAuthenticated(), issueRoutes);
router.use('/issueComment', isAuthenticated(), issueCommentRoutes);
router.use('/auth', authRoutes);
// TMDB-related endpoints removed for music-only fork
      return next({
        status: 500,
        message: 'Unable to retrieve movie certifications.',
      });
    }
  }
);

router.get('/certifications/tv', isAuthenticated(), async (req, res, next) => {
  const tmdb = new TheMovieDb();

  try {
    const certifications = await tmdb.getTvCertifications();

    return res.status(200).json(certifications);
  } catch (e) {
    logger.debug('Something went wrong retrieving TV certifications', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve TV certifications.',
    });
  }
});

router.get('/', (_req, res) => {
  return res.status(200).json({
    api: 'Seerr API',
    version: '1.0',
  });
});

export default router;
