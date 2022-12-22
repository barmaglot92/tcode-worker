import * as ffprobe from 'ffprobe';
import * as ffprobeStatic from 'ffprobe-static';
import * as fs from 'fs/promises';

export const getFps = (file) => {
  return ffprobe(file, { path: ffprobeStatic.path }).then((res) => {
    const fps = res.streams[0]?.r_frame_rate;
    if (fps) {
      return fps.split('/')[0];
    } else {
      return undefined;
    }
  });
};

export const getInfo = async (filePath: string) => {
  return ffprobe(filePath, { path: ffprobeStatic.path });
};
