import { Job } from 'bull';

export const log = async (job: Job, str: string) => {
  job.log(str);
  console.log(str);
};
