import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { parseProgress } from '@dropb/ffmpeg-progress';

const defaultParams = {
  segmentTargetDuration: 4,
  maxBitrateRatio: 1.07,
  rateMonitorBufferRatio: 1.5,
  keyFramesInterval: 50,
  renditions: [
    {
      width: 640,
      height: 360,
      bitrate: 800,
      audiorate: 96,
    },
    {
      width: 842,
      height: 480,
      bitrate: 1400,
      audiorate: 128,
    },
    {
      width: 1280,
      height: 720,
      bitrate: 2800,
      audiorate: 128,
    },
    {
      width: 1920,
      height: 1080,
      bitrate: 5000,
      audiorate: 192,
    },
  ],
};

type ConvertHlsParams = {
  targetDir: string;
  duration: number;
  onProgress: (progress: number) => void;
  log: (str: string) => void;
};

export const convertHls = async (input, _params: ConvertHlsParams) => {
  const params = { ...defaultParams, ..._params };
  const {
    keyFramesInterval,
    segmentTargetDuration,
    maxBitrateRatio,
    rateMonitorBufferRatio,
    targetDir: target,
    duration,
    onProgress,
    log,
  } = params;

  const staticParams = [
    '-c:a aac -ar 48000 -c:v h264 -profile:v main -crf 20 -sc_threshold 0',
    ` -g ${keyFramesInterval} -keyint_min ${keyFramesInterval} -hls_time ${segmentTargetDuration}`,
    ' -hls_playlist_type vod',
  ];

  const miscParams = ['-hide_banner -y', '-loglevel info'];

  const masterPlaylist = ['#EXTM3U\n#EXT-X-VERSION:3\n'];

  const cmd = [];

  params.renditions.forEach((rendition) => {
    const { width, height, bitrate, audiorate } = rendition;

    const maxRate = bitrate * maxBitrateRatio;
    const bufsize = bitrate * rateMonitorBufferRatio;
    const bandwidth = bitrate * 1000;

    const name = `${height}p`;
    const endpoint = `${name}.m3u8`;

    cmd.push(` ${staticParams.join('')} -vf scale=w=${width}:h=${height}`);
    cmd.push(
      ` -b:v ${bitrate}k -maxrate ${maxRate}k -bufsize ${bufsize}k -b:a ${audiorate}k`,
    );
    cmd.push(
      ` -hls_segment_filename ${target}/${name}_%03d.ts ${target}/${name}.m3u8`,
    );

    masterPlaylist.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${`${width}x${height}`}\n${endpoint}\n`,
    );
  });

  const ffmpeg = spawn(
    `${ffmpegPath} ${miscParams.join(' ')} -i ${input} ${cmd.join('')}`,
    {
      shell: true,
    },
  );

  return new Promise((resolve, reject) => {
    let out = [];
    let err = [];

    ffmpeg.stdout.on('data', (data) => {
      out = out.concat(data);
      logProgress(data, duration, onProgress);
    });

    ffmpeg.stderr.on('data', (data) => {
      err = err.concat(data);
      logProgress(data, duration, onProgress);
    });

    ffmpeg.on('exit', async (code) => {
      if (code !== 0) {
        reject(new Error(err.toString()));
      } else {
        await fs.promises.writeFile(
          path.resolve(target, 'index.m3u8'),
          masterPlaylist.join(''),
          { encoding: 'utf-8' },
        );
        resolve(out.toString());
      }
    });
  });
};

function logProgress(data, durationSec, onProgress) {
  const progress = parseProgress(data.toString(), durationSec * 1000);
  if (progress) {
    onProgress(Math.min(progress.percentage, 100));
  }
}
