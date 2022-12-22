import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { TranscodeJobData } from 'src/types/TranscodeJobData';
import { downloadAndSaveFile, uploadFiles } from 'src/utils/common';
import { convertHls } from 'src/utils/convertHls';
import { log } from 'src/utils/log';
import { getInfo } from 'src/utils/video';

@Processor('video')
export class VideoProcessor {
  @Process('transcode')
  async transcode(job: Job<TranscodeJobData>) {
    const { downloadUrl, videoId, presignedUpload } = job.data;

    log(job, `start video downloading: ${downloadUrl}`);

    const { srcFilePath, targetDir } = await downloadAndSaveFile({
      downloadUrl,
      videoId,
      onProgress: (progress) => {
        /** */
      },
    });

    const {
      streams: [{ duration }],
    } = await getInfo(srcFilePath);

    log(job, `start video processing`);

    await convertHls(srcFilePath, {
      targetDir,
      duration: Number(duration),
      onProgress: (progress) => job.progress(progress),
      log: (str: string) => log(job, str),
    });

    log(job, `uploading files`);

    await uploadFiles(targetDir, presignedUpload, videoId);

    log(job, 'done');
  }
}
