import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadFileUseCaseImpl } from '../file/UploadFileUseCaseImpl';
import {
  BUSINESS_IMAGE_UPLOAD_TYPE,
  PROFILE_PICTURE_UPLOAD_TYPE,
  FileUploadError,
  FileUploadErrorCode,
  MAX_BUSINESS_IMAGE_SIZE_IN_BYTES,
  MAX_PROFILE_PICTURE_SIZE_IN_BYTES,
} from '@domain';
import type { FileUploadRepository, PendingUpload } from '@domain';

const pendingUpload: PendingUpload = {
  uploadId: 'c0ffee00-0000-0000-0000-000000000001',
  contentType: 'image/png',
  sizeInBytes: 1024,
  expiresAt: '2026-09-11T15:14:40',
};

/** jsdom does not size a File from its parts reliably, so both fields are stubbed. */
const fakeFile = (contentType: string, sizeInBytes: number): File =>
  ({ type: contentType, size: sizeInBytes, name: 'logo' }) as unknown as File;

let mockRepo: FileUploadRepository;

beforeEach(() => {
  mockRepo = {
    upload: vi.fn().mockResolvedValue(pendingUpload),
  };
});

describe('UploadFileUseCaseImpl', () => {
  it('delegates an acceptable business image to the repository', async () => {
    const useCase = new UploadFileUseCaseImpl(mockRepo);
    const command = { file: fakeFile('image/png', 1024), type: BUSINESS_IMAGE_UPLOAD_TYPE };

    const result = await useCase.execute(command);

    expect(mockRepo.upload).toHaveBeenCalledWith(command);
    expect(result).toEqual(pendingUpload);
  });

  it('rejects a file over the size limit without calling the repository', async () => {
    const useCase = new UploadFileUseCaseImpl(mockRepo);
    const command = {
      file: fakeFile('image/jpeg', MAX_BUSINESS_IMAGE_SIZE_IN_BYTES + 1),
      type: BUSINESS_IMAGE_UPLOAD_TYPE,
    };

    await expect(useCase.execute(command)).rejects.toMatchObject({
      reason: FileUploadErrorCode.FILE_TOO_LARGE,
    });
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(FileUploadError);
    expect(mockRepo.upload).not.toHaveBeenCalled();
  });

  it('accepts a file exactly at the size limit', async () => {
    const useCase = new UploadFileUseCaseImpl(mockRepo);
    const command = {
      file: fakeFile('image/png', MAX_BUSINESS_IMAGE_SIZE_IN_BYTES),
      type: BUSINESS_IMAGE_UPLOAD_TYPE,
    };

    await useCase.execute(command);

    expect(mockRepo.upload).toHaveBeenCalledWith(command);
  });

  it('rejects an unsupported content type without calling the repository', async () => {
    const useCase = new UploadFileUseCaseImpl(mockRepo);
    const command = { file: fakeFile('application/pdf', 2048), type: BUSINESS_IMAGE_UPLOAD_TYPE };

    await expect(useCase.execute(command)).rejects.toMatchObject({
      reason: FileUploadErrorCode.CONTENT_TYPE_UNSUPPORTED,
    });
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(FileUploadError);
    expect(mockRepo.upload).not.toHaveBeenCalled();
  });

  it('rejects an empty file without calling the repository', async () => {
    const useCase = new UploadFileUseCaseImpl(mockRepo);
    const command = { file: fakeFile('image/webp', 0), type: BUSINESS_IMAGE_UPLOAD_TYPE };

    await expect(useCase.execute(command)).rejects.toMatchObject({
      reason: FileUploadErrorCode.FILE_EMPTY,
    });
    expect(mockRepo.upload).not.toHaveBeenCalled();
  });

  it('propagates a repository failure', async () => {
    const failure = new FileUploadError(FileUploadErrorCode.UPLOAD_FORBIDDEN);
    mockRepo.upload = vi.fn().mockRejectedValue(failure);
    const useCase = new UploadFileUseCaseImpl(mockRepo);

    await expect(
      useCase.execute({ file: fakeFile('image/png', 512), type: BUSINESS_IMAGE_UPLOAD_TYPE }),
    ).rejects.toBe(failure);
  });

  it('delegates an acceptable profile picture to the repository', async () => {
    const useCase = new UploadFileUseCaseImpl(mockRepo);
    const command = { file: fakeFile('image/png', 1024), type: PROFILE_PICTURE_UPLOAD_TYPE };

    const result = await useCase.execute(command);

    expect(mockRepo.upload).toHaveBeenCalledWith(command);
    expect(result).toEqual(pendingUpload);
  });

  it('accepts a profile picture exactly at the size limit', async () => {
    const useCase = new UploadFileUseCaseImpl(mockRepo);
    const command = {
      file: fakeFile('image/png', MAX_PROFILE_PICTURE_SIZE_IN_BYTES),
      type: PROFILE_PICTURE_UPLOAD_TYPE,
    };

    await useCase.execute(command);

    expect(mockRepo.upload).toHaveBeenCalledWith(command);
  });

  it('rejects a profile picture over the size limit without calling the repository', async () => {
    const useCase = new UploadFileUseCaseImpl(mockRepo);
    const command = {
      file: fakeFile('image/jpeg', MAX_PROFILE_PICTURE_SIZE_IN_BYTES + 1),
      type: PROFILE_PICTURE_UPLOAD_TYPE,
    };

    await expect(useCase.execute(command)).rejects.toMatchObject({
      reason: FileUploadErrorCode.FILE_TOO_LARGE,
    });
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(FileUploadError);
    expect(mockRepo.upload).not.toHaveBeenCalled();
  });

  it('rejects an unsupported content type for a profile picture without calling the repository', async () => {
    const useCase = new UploadFileUseCaseImpl(mockRepo);
    const command = { file: fakeFile('application/pdf', 2048), type: PROFILE_PICTURE_UPLOAD_TYPE };

    await expect(useCase.execute(command)).rejects.toMatchObject({
      reason: FileUploadErrorCode.CONTENT_TYPE_UNSUPPORTED,
    });
    expect(mockRepo.upload).not.toHaveBeenCalled();
  });

  it('rejects an empty profile picture without calling the repository', async () => {
    const useCase = new UploadFileUseCaseImpl(mockRepo);
    const command = { file: fakeFile('image/webp', 0), type: PROFILE_PICTURE_UPLOAD_TYPE };

    await expect(useCase.execute(command)).rejects.toMatchObject({
      reason: FileUploadErrorCode.FILE_EMPTY,
    });
    expect(mockRepo.upload).not.toHaveBeenCalled();
  });
});
