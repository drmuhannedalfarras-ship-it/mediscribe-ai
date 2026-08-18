import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranscriptService } from './transcript.service';
import { ConsultationTranscript } from '@entities/consultation-transcript.entity';

describe('TranscriptService', () => {
  let service: TranscriptService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptService,
        {
          provide: getRepositoryToken(ConsultationTranscript),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TranscriptService>(TranscriptService);
  });

  describe('createTranscript', () => {
    it('should create transcript from audio session', async () => {
      const transcriptData = {
        consultationId: 'consul-001',
        audioSessionId: 'audio-001',
        text: 'Doctor: How are you feeling? Patient: I have chest pain.',
        language: 'en',
        status: 'completed',
      };

      mockRepository.save.mockResolvedValue({ id: 'transcript-001', ...transcriptData });

      const result = await service.createTranscript(transcriptData);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.text).toBeDefined();
    });

    it('should validate transcript language', () => {
      const validLanguages = ['en', 'ar', 'es', 'fr'];

      validLanguages.forEach(lang => {
        expect(service.isValidLanguage(lang)).toBe(true);
      });
    });
  });

  describe('getTranscript', () => {
    it('should retrieve full transcript', async () => {
      const transcript = {
        id: 'transcript-001',
        consultationId: 'consul-001',
        text: 'Doctor: How are you? Patient: Fine.',
        status: 'completed',
      };

      mockRepository.findOne.mockResolvedValue(transcript);

      const result = await service.getTranscript('transcript-001');

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it('should throw NotFoundException if transcript not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getTranscript('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getConsultationTranscript', () => {
    it('should retrieve transcript by consultation ID', async () => {
      const transcript = {
        id: 'transcript-001',
        consultationId: 'consul-001',
        text: 'Conversation transcript',
      };

      mockRepository.findOne.mockResolvedValue(transcript);

      const result = await service.getConsultationTranscript('consul-001');

      expect(result.consultationId).toBe('consul-001');
    });
  });

  describe('editTranscript', () => {
    it('should update transcript text', async () => {
      const original = {
        id: 'transcript-001',
        text: 'Original text with typo',
      };

      mockRepository.findOne.mockResolvedValue(original);
      mockRepository.save.mockResolvedValue({
        ...original,
        text: 'Original text with typo fixed',
      });

      const result = await service.editTranscript('transcript-001', {
        text: 'Original text with typo fixed',
      });

      expect(result.text).toContain('fixed');
    });

    it('should track original transcript', async () => {
      const transcript = {
        id: 'transcript-001',
        text: 'Updated text',
        originalText: 'Original text',
      };

      mockRepository.findOne.mockResolvedValue(transcript);

      const result = await service.getTranscript('transcript-001');

      expect(result.originalText).toBeDefined();
    });
  });

  describe('segmentTranscriptBySpeaker', () => {
    it('should segment transcript by speaker', () => {
      const transcript = 'Doctor: How are you? Patient: I have pain.';

      const segments = service.segmentBySpeaker(transcript);

      expect(Array.isArray(segments)).toBe(true);
      expect(segments.length).toBeGreaterThan(0);
    });

    it('should identify physician and patient segments', () => {
      const transcript = 'Doctor: Hello. Patient: Hi there.';

      const segments = service.segmentBySpeaker(transcript);

      expect(segments.some(s => s.speaker === 'Doctor')).toBe(true);
      expect(segments.some(s => s.speaker === 'Patient')).toBe(true);
    });
  });

  describe('getTranscriptSummary', () => {
    it('should generate transcript summary', async () => {
      const transcript = {
        id: 'transcript-001',
        text: 'Long consultation transcript...',
      };

      mockRepository.findOne.mockResolvedValue(transcript);

      const summary = await service.generateSummary('transcript-001');

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
    });
  });

  describe('searchTranscript', () => {
    it('should search transcript text', async () => {
      const transcripts = [
        { id: 'transcript-001', text: 'Patient has chest pain' },
        { id: 'transcript-002', text: 'Patient is healthy' },
      ];

      mockRepository.find.mockResolvedValue(
        transcripts.filter(t => t.text.includes('chest')),
      );

      const results = await service.searchTranscript('chest');

      expect(results.length).toBe(1);
      expect(results[0].text).toContain('chest');
    });

    it('should perform case-insensitive search', async () => {
      const transcripts = [
        { id: 'transcript-001', text: 'Patient reports Chest pain' },
      ];

      mockRepository.find.mockResolvedValue(transcripts);

      const results = await service.searchTranscript('CHEST');

      expect(results.length).toBe(1);
    });
  });

  describe('validateTranscriptAccuracy', () => {
    it('should validate transcript completeness', () => {
      const transcript = {
        text: 'Complete transcript with full conversation',
        wordCount: 7,
      };

      const isValid = service.isValidTranscript(transcript);

      expect(isValid).toBe(true);
    });

    it('should flag empty transcripts', () => {
      const transcript = {
        text: '',
        wordCount: 0,
      };

      const isValid = service.isValidTranscript(transcript);

      expect(isValid).toBe(false);
    });
  });

  describe('calculateTranscriptMetrics', () => {
    it('should calculate word count', () => {
      const transcript = 'Doctor: How are you? Patient: I am fine.';

      const wordCount = service.countWords(transcript);

      expect(wordCount).toBeGreaterThan(0);
    });

    it('should calculate reading time', () => {
      const transcript = 'This is a sample transcript. ' .repeat(50);

      const readingTime = service.calculateReadingTime(transcript);

      expect(typeof readingTime).toBe('number');
      expect(readingTime).toBeGreaterThan(0);
    });
  });

  describe('exportTranscript', () => {
    it('should export transcript to file', async () => {
      const transcript = {
        id: 'transcript-001',
        text: 'Conversation transcript',
      };

      mockRepository.findOne.mockResolvedValue(transcript);

      const exported = await service.exportToFile('transcript-001', 'txt');

      expect(exported).toBeDefined();
    });

    it('should support multiple export formats', () => {
      const formats = ['txt', 'pdf', 'doc'];

      formats.forEach(format => {
        expect(service.isSupportedFormat(format)).toBe(true);
      });
    });
  });

  describe('identifyLanguageInTranscript', () => {
    it('should detect transcript language', () => {
      const transcript = 'This is an English transcript.';

      const language = service.detectLanguage(transcript);

      expect(language).toBe('en');
    });

    it('should handle mixed language transcripts', () => {
      const transcript = 'Doctor: Hello. المريض: مرحبا.';

      const languages = service.detectLanguages(transcript);

      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
    });
  });

  describe('transcriptVersionControl', () => {
    it('should track transcript versions', async () => {
      const versions = [
        { version: 1, text: 'Original' },
        { version: 2, text: 'Edited' },
      ];

      mockRepository.find.mockResolvedValue(versions);

      const history = await service.getTranscriptVersions('transcript-001');

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(2);
    });
  });
});
