import * as path from 'path';
import { Config } from './config';
import * as fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import axios from 'axios';
import * as FormData from 'form-data';
import * as glob from 'glob';

export const downloadAndSaveFile = async ({
  videoId,
  downloadUrl,
  onProgress,
}: {
  videoId: string;
  downloadUrl: string;
  onProgress: (progress: number) => void;
}): Promise<{ srcFilePath: string; targetDir: string }> => {
  const videoDir = path.resolve(Config.TMP_FOLDER, videoId);

  await createVideoWorkingDir(videoDir);

  await axios
    .get<ReadableStream>(downloadUrl, {
      responseType: 'stream',
      onDownloadProgress: (progressEvent) => {
        onProgress(progressEvent.progress * 100);
      },
    })
    .then((res: any) => {
      const writeStream = createWriteStream(
        path.resolve(videoDir, 'src', 'video.mp4'),
      );

      return new Promise((resolve, reject) => {
        res.data.pipe(writeStream);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
      });
    });

  return {
    srcFilePath: path.resolve(videoDir, 'src', 'video.mp4'),
    targetDir: path.resolve(videoDir, 'hls'),
  };
};

export const createVideoWorkingDir = async (dir: string) => {
  await fs.rm(dir, { recursive: true, force: true });

  return Promise.all([
    fs.mkdir(path.resolve(dir, 'src'), { recursive: true }),
    fs.mkdir(path.resolve(dir, 'hls'), { recursive: true }),
  ]);
};

export const uploadFiles = async (
  dir: string,
  presignedUpload: AWS.S3.PresignedPost,
  videoId: string,
) => {
  return new Promise((resolve, reject) =>
    glob(`${dir}/*`, {}, (err, files) => {
      if (err) {
        reject(err);
      } else {
        const requests = files.map((file) => {
          const bodyFormData = new FormData();

          bodyFormData.append('key', `${videoId}/${path.basename(file)}`);

          Object.entries(presignedUpload.fields).forEach(([field, value]) => {
            bodyFormData.append(field, value);
          });

          bodyFormData.append('file', createReadStream(file));

          return axios.post(presignedUpload.url, bodyFormData);
        });

        Promise.all(requests).then(resolve).catch(reject);
      }
    }),
  );
};
