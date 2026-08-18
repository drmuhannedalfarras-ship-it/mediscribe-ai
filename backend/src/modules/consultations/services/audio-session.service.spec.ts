import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AudioSessionService } from './audio-session.service';
import { AudioSession, AudioSessionStatus } from '@entities/audio-session.entity';
import { Consultation } from '@entities/consultation.entity';

describe('AudioSessionService', () => {
  let service: AudioSessionService;
  let mockAudioSessionRepository: any;
  let mockConsultationRepository: any;

  beforeEach(async () => {
    mockAudioSessionRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      softRemove: jest.fn(),
    };

    mockConsultationRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioSessionService,
        { provide: getRepositoryToken(AudioSession), useValue: mockAudioSessionRepository },
        { provide: getRepositoryToken(Consultation), useValue: mockConsultationRepository },
      ],
    }).compile();

    service = module.get<AudioSessionService>(AudioSessionService);
  });

  describe('startRecording', () => {
    it('should create a new session when none exists yet', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockAudioSessionRepository.findOne.mockResolvedValue(null);
      mockAudioSessionRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const result = await service.startRecording('consul-001');

      expect(result.status).toBe(AudioSessionStatus.RECORDING);
      expect(mockAudioSessionRepository.create).toHaveBeenCalled();
    });

    it('should reset an existing non-recording session instead of creating a second row', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      const existing = {
        id: 'session-001',
        status: AudioSessionStatus.PROCESSED,
        audioFileUrl: '/old/file.webm',
        wordCount: 42,
      };
      mockAudioSessionRepository.findOne.mockResolvedValue(existing);
      mockAudioSessionRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const result = await service.startRecording('consul-001');

      expect(result).toBe(existing);
      expect(result.status).toBe(AudioSessionStatus.RECORDING);
      expect(result.audioFileUrl).toBeNull();
      expect(result.wordCount).toBeNull();
      expect(mockAudioSessionRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if a recording is already in progress', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockAudioSessionRepository.findOne.mockResolvedValue({
        status: AudioSessionStatus.RECORDING,
      });

      await expect(service.startRecording('consul-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if the consultation does not exist', async () => {
      mockConsultationRepository.findOne.mockResolvedValue(null);

      await expect(service.startRecording('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('stopRecording', () => {
    it('should mark the session as processing and store duration in seconds', async () => {
      mockAudioSessionRepository.findOne.mockResolvedValue({
        status: AudioSessionStatus.RECORDING,
      });
      mockAudioSessionRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const result = await service.stopRecording('consul-001', '/uploads/a.webm', 15000);

      expect(result.status).toBe(AudioSessionStatus.PROCESSING);
      expect(result.durationSeconds).toBe(15);
      expect(result.audioFileUrl).toBe('/uploads/a.webm');
    });

    it('should throw NotFoundException if there is no active recording', async () => {
      mockAudioSessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.stopRecording('consul-001', '/uploads/a.webm', 15000),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if the recording is shorter than 10 seconds', async () => {
      mockAudioSessionRepository.findOne.mockResolvedValue({
        status: AudioSessionStatus.RECORDING,
      });

      await expect(
        service.stopRecording('consul-001', '/uploads/a.webm', 5000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if the recording exceeds 60 minutes', async () => {
      mockAudioSessionRepository.findOne.mockResolvedValue({
        status: AudioSessionStatus.RECORDING,
      });

      await expect(
        service.stopRecording('consul-001', '/uploads/a.webm', 3600 * 1000 + 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('saveUploadedAudio', () => {
    it('should stop the recording and attach file metadata', async () => {
      mockAudioSessionRepository.findOne.mockResolvedValue({
        status: AudioSessionStatus.RECORDING,
      });
      mockAudioSessionRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const result = await service.saveUploadedAudio(
        'consul-001',
        '/uploads/a.webm',
        20000,
        'webm',
        15000,
      );

      expect(result.audioFileSize).toBe(20000);
      expect(result.audioFormat).toBe('webm');
      expect(result.durationSeconds).toBe(15);
    });
  });

  describe('markTranscribed', () => {
    it('should mark the session processed with a word count', async () => {
      mockAudioSessionRepository.findOne.mockResolvedValue({ id: 'session-001' });
      mockAudioSessionRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const result = await service.markTranscribed('consul-001', 120);

      expect(result.status).toBe(AudioSessionStatus.PROCESSED);
      expect(result.wordCount).toBe(120);
    });

    it('should throw NotFoundException if no session exists', async () => {
      mockAudioSessionRepository.findOne.mockResolvedValue(null);

      await expect(service.markTranscribed('missing', 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markTranscriptionFailed', () => {
    it('should mark the session failed with an error message', async () => {
      mockAudioSessionRepository.findOne.mockResolvedValue({ id: 'session-001' });
      mockAudioSessionRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const result = await service.markTranscriptionFailed('consul-001', 'boom');

      expect(result.status).toBe(AudioSessionStatus.FAILED);
      expect(result.errorMessage).toBe('boom');
    });
  });

  describe('validateAudioFile', () => {
    it('should accept a supported format under the size limit', () => {
      const result = service.validateAudioFile('recording.webm', 1024);

      expect(result.valid).toBe(true);
    });

    it('should reject an unsupported extension', () => {
      const result = service.validateAudioFile('recording.mov', 1024);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported audio format');
    });

    it('should reject a file over the size limit', () => {
      const result = service.validateAudioFile('recording.webm', 600 * 1024 * 1024);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });
  });

  describe('getAudioStats', () => {
    it('should aggregate totals across sessions', async () => {
      mockAudioSessionRepository.find.mockResolvedValue([
        { durationSeconds: 60, wordCount: 100 },
        { durationSeconds: 120, wordCount: 200 },
      ]);
      mockAudioSessionRepository.count.mockResolvedValueOnce(5).mockResolvedValueOnce(1);

      const stats = await service.getAudioStats();

      expect(stats.completed).toBe(2);
      expect(stats.totalSessions).toBe(5);
      expect(stats.failed).toBe(1);
      expect(stats.totalDuration).toBe(180);
      expect(stats.avgDuration).toBe(90);
      expect(stats.totalWords).toBe(300);
    });
  });

  describe('deleteRecording', () => {
    it('should soft-remove the session', async () => {
      const session = { id: 'session-001' };
      mockAudioSessionRepository.findOne.mockResolvedValue(session);

      await service.deleteRecording('consul-001');

      expect(mockAudioSessionRepository.softRemove).toHaveBeenCalledWith(session);
    });

    it('should throw NotFoundException if no session exists', async () => {
      mockAudioSessionRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteRecording('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAudioSessionDetails', () => {
    it('should return the session when found', async () => {
      const session = { id: 'session-001' };
      mockAudioSessionRepository.findOne.mockResolvedValue(session);

      const result = await service.getAudioSessionDetails('consul-001');

      expect(result).toBe(session);
    });

    it('should throw NotFoundException when no session exists', async () => {
      mockAudioSessionRepository.findOne.mockResolvedValue(null);

      await expect(service.getAudioSessionDetails('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
