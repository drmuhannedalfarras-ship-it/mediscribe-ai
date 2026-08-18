import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AudioSessionService } from './audio-session.service';
import { AudioSession } from '@entities/audio-session.entity';

describe('AudioSessionService', () => {
  let service: AudioSessionService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioSessionService,
        {
          provide: getRepositoryToken(AudioSession),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AudioSessionService>(AudioSessionService);
  });

  describe('startAudioSession', () => {
    it('should start new audio session', async () => {
      const sessionData = {
        consultationId: 'consul-001',
        physicianId: 'phys-001',
        patientId: 'patient-001',
        status: 'recording',
      };

      mockRepository.save.mockResolvedValue({ id: 'audio-001', ...sessionData });

      const result = await service.startAudioSession(sessionData);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.status).toBe('recording');
    });

    it('should set start timestamp', async () => {
      const sessionData = {
        consultationId: 'consul-001',
        physicianId: 'phys-001',
        status: 'recording',
      };

      mockRepository.save.mockResolvedValue({
        id: 'audio-001',
        ...sessionData,
        startTime: expect.any(Date),
      });

      const result = await service.startAudioSession(sessionData);

      expect(result.startTime).toBeDefined();
    });

    it('should reject if consultation already has active session', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'audio-001', status: 'recording' });

      await expect(
        service.startAudioSession({ consultationId: 'consul-001' }),
      ).rejects.toThrow();
    });
  });

  describe('stopAudioSession', () => {
    it('should stop audio session and record duration', async () => {
      const session = {
        id: 'audio-001',
        status: 'recording',
        startTime: new Date('2026-08-16T10:00:00'),
      };

      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue({
        ...session,
        status: 'completed',
        endTime: new Date('2026-08-16T10:15:00'),
      });

      const result = await service.stopAudioSession('audio-001');

      expect(result.status).toBe('completed');
      expect(result.endTime).toBeDefined();
    });

    it('should calculate session duration', async () => {
      const session = {
        id: 'audio-001',
        startTime: new Date('2026-08-16T10:00:00'),
        endTime: new Date('2026-08-16T10:15:00'),
      };

      const duration = service.calculateDuration(session.startTime, session.endTime);

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('pauseAudioSession', () => {
    it('should pause recording session', async () => {
      const session = {
        id: 'audio-001',
        status: 'recording',
      };

      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue({
        ...session,
        status: 'paused',
      });

      const result = await service.pauseAudioSession('audio-001');

      expect(result.status).toBe('paused');
    });

    it('should resume paused session', async () => {
      const session = {
        id: 'audio-001',
        status: 'paused',
      };

      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue({
        ...session,
        status: 'recording',
      });

      const result = await service.resumeAudioSession('audio-001');

      expect(result.status).toBe('recording');
    });
  });

  describe('getAudioSession', () => {
    it('should retrieve audio session details', async () => {
      const session = {
        id: 'audio-001',
        consultationId: 'consul-001',
        status: 'recording',
        duration: 900,
      };

      mockRepository.findOne.mockResolvedValue(session);

      const result = await service.getAudioSession('audio-001');

      expect(result).toBeDefined();
      expect(result.consultationId).toBe('consul-001');
    });

    it('should throw NotFoundException if session not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getAudioSession('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('uploadAudioFile', () => {
    it('should store audio file reference', async () => {
      const uploadData = {
        sessionId: 'audio-001',
        filePath: '/audio/session-001.wav',
        fileSize: 5000000,
        format: 'wav',
      };

      mockRepository.save.mockResolvedValue({
        id: 'audio-001',
        ...uploadData,
      });

      const result = await service.uploadAudioFile('audio-001', uploadData);

      expect(result.filePath).toBe('/audio/session-001.wav');
    });

    it('should validate audio file format', () => {
      const validFormats = ['wav', 'mp3', 'm4a', 'aac'];

      validFormats.forEach(format => {
        expect(service.isValidAudioFormat(format)).toBe(true);
      });
    });

    it('should reject invalid audio format', () => {
      expect(service.isValidAudioFormat('doc')).toBe(false);
    });
  });

  describe('getAudioDuration', () => {
    it('should calculate total audio duration', async () => {
      const session = {
        id: 'audio-001',
        startTime: new Date('2026-08-16T10:00:00'),
        endTime: new Date('2026-08-16T10:30:00'),
      };

      mockRepository.findOne.mockResolvedValue(session);

      const duration = await service.getAudioDuration('audio-001');

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('validateAudioQuality', () => {
    it('should validate audio quality metrics', () => {
      const audioMetrics = {
        sampleRate: 44100,
        channels: 2,
        bitDepth: 16,
      };

      const isValid = service.validateAudioMetrics(audioMetrics);

      expect(isValid).toBe(true);
    });

    it('should reject low sample rate', () => {
      const audioMetrics = {
        sampleRate: 8000, // Too low for speech
        channels: 1,
        bitDepth: 16,
      };

      const isValid = service.validateAudioMetrics(audioMetrics);

      expect(isValid).toBe(false);
    });
  });

  describe('checkAudioNoise', () => {
    it('should detect excessive noise in audio', () => {
      const audioData = {
        noiseLevel: 0.8, // High noise
      };

      const hasExcessiveNoise = service.hasExcessiveNoise(audioData);

      expect(hasExcessiveNoise).toBe(true);
    });

    it('should accept acceptable noise levels', () => {
      const audioData = {
        noiseLevel: 0.2, // Acceptable
      };

      const hasExcessiveNoise = service.hasExcessiveNoise(audioData);

      expect(hasExcessiveNoise).toBe(false);
    });
  });

  describe('getAudioMetadata', () => {
    it('should retrieve audio session metadata', async () => {
      const session = {
        id: 'audio-001',
        consultationId: 'consul-001',
        startTime: new Date(),
        endTime: new Date(),
        format: 'wav',
        fileSize: 5000000,
      };

      mockRepository.findOne.mockResolvedValue(session);

      const metadata = await service.getAudioMetadata('audio-001');

      expect(metadata).toBeDefined();
      expect(metadata.format).toBe('wav');
    });
  });

  describe('deleteAudioFile', () => {
    it('should mark audio file for deletion', async () => {
      const session = {
        id: 'audio-001',
        status: 'completed',
      };

      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue({
        ...session,
        status: 'deleted',
        deletedAt: new Date(),
      });

      const result = await service.deleteAudioFile('audio-001');

      expect(result.status).toBe('deleted');
    });
  });

  describe('calculateAudioStats', () => {
    it('should calculate audio statistics', () => {
      const sessions = [
        { duration: 900 },
        { duration: 1200 },
        { duration: 600 },
      ];

      const stats = service.calculateSessionStats(sessions);

      expect(stats.total).toBe(2700);
      expect(stats.average).toBe(900);
      expect(stats.count).toBe(3);
    });
  });

  describe('validateSpeakerDiarization', () => {
    it('should validate speaker identification data', () => {
      const diarizationData = {
        speakers: [
          { id: 'speaker-1', name: 'Physician' },
          { id: 'speaker-2', name: 'Patient' },
        ],
      };

      const isValid = service.isValidDiarization(diarizationData);

      expect(isValid).toBe(true);
    });

    it('should require at least 2 speakers', () => {
      const diarizationData = {
        speakers: [
          { id: 'speaker-1', name: 'Physician' },
        ],
      };

      const isValid = service.isValidDiarization(diarizationData);

      expect(isValid).toBe(false);
    });
  });
});
