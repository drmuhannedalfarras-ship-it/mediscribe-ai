import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TranscriptService } from './transcript.service';
import { TranscriptSegment, Speaker } from '@entities/transcript-segment.entity';
import { Consultation } from '@entities/consultation.entity';

describe('TranscriptService', () => {
  let service: TranscriptService;
  let mockTranscriptRepository: any;
  let mockConsultationRepository: any;

  beforeEach(async () => {
    mockTranscriptRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      softRemove: jest.fn(),
    };

    mockConsultationRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptService,
        {
          provide: getRepositoryToken(TranscriptSegment),
          useValue: mockTranscriptRepository,
        },
        {
          provide: getRepositoryToken(Consultation),
          useValue: mockConsultationRepository,
        },
      ],
    }).compile();

    service = module.get<TranscriptService>(TranscriptService);
  });

  describe('addTranscriptSegment', () => {
    it('should save a segment when the consultation exists', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockTranscriptRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const result = await service.addTranscriptSegment(
        'consul-001',
        Speaker.PHYSICIAN,
        '  How are you feeling?  ',
        0,
        5,
        0.95,
        1,
      );

      expect(mockTranscriptRepository.save).toHaveBeenCalled();
      expect(result.text).toBe('How are you feeling?');
      expect(result.sequenceNumber).toBe(1);
    });

    it('should throw NotFoundException if the consultation does not exist', async () => {
      mockConsultationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addTranscriptSegment('missing', Speaker.PATIENT, 'hi', 0, 1, undefined, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addTranscriptSegmentsBatch', () => {
    it('should insert segments with an incrementing sequence number', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockTranscriptRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const results = await service.addTranscriptSegmentsBatch('consul-001', [
        { speaker: Speaker.PATIENT, text: 'I have a headache.', startTime: 0, endTime: 5 },
        { speaker: Speaker.PHYSICIAN, text: 'Since when?', startTime: 5, endTime: 8 },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].sequenceNumber).toBe(1);
      expect(results[1].sequenceNumber).toBe(2);
    });
  });

  describe('getFullTranscript', () => {
    it('should return segments ordered by start time', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      const segments = [{ id: 'seg-1' }, { id: 'seg-2' }];
      mockTranscriptRepository.find.mockResolvedValue(segments);

      const result = await service.getFullTranscript('consul-001');

      expect(result).toBe(segments);
      expect(mockTranscriptRepository.find).toHaveBeenCalledWith({
        where: { consultationId: 'consul-001' },
        order: { startTimestamp: 'ASC' },
      });
    });

    it('should throw NotFoundException if the consultation does not exist', async () => {
      mockConsultationRepository.findOne.mockResolvedValue(null);

      await expect(service.getFullTranscript('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTranscriptBySpeaker', () => {
    it('should filter segments by speaker', async () => {
      const segments = [{ id: 'seg-1', speaker: Speaker.PHYSICIAN }];
      mockTranscriptRepository.find.mockResolvedValue(segments);

      const result = await service.getTranscriptBySpeaker('consul-001', Speaker.PHYSICIAN);

      expect(result).toBe(segments);
      expect(mockTranscriptRepository.find).toHaveBeenCalledWith({
        where: { consultationId: 'consul-001', speaker: Speaker.PHYSICIAN },
        order: { startTimestamp: 'ASC' },
      });
    });
  });

  describe('correctSegment', () => {
    it('should update the corrected text on an existing segment', async () => {
      const segment = { id: 'seg-1', text: 'orig', correctedText: null };
      mockTranscriptRepository.findOne.mockResolvedValue(segment);
      mockTranscriptRepository.save.mockImplementation((s: any) => Promise.resolve(s));

      const result = await service.correctSegment('seg-1', '  fixed text  ');

      expect(result.correctedText).toBe('fixed text');
    });

    it('should throw NotFoundException if the segment does not exist', async () => {
      mockTranscriptRepository.findOne.mockResolvedValue(null);

      await expect(service.correctSegment('missing', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFormattedTranscript', () => {
    it('should group consecutive segments by speaker and prefer corrected text', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockTranscriptRepository.find.mockResolvedValue([
        { speaker: Speaker.PATIENT, text: 'origianl', correctedText: 'original' },
        { speaker: Speaker.PHYSICIAN, text: 'Noted.', correctedText: null },
      ]);

      const formatted = await service.getFormattedTranscript('consul-001');

      expect(formatted).toContain('**PATIENT:**');
      expect(formatted).toContain('original');
      expect(formatted).toContain('**PHYSICIAN:**');
      expect(formatted).toContain('Noted.');
    });
  });

  describe('getTranscriptStats', () => {
    it('should tally word counts per speaker and average confidence', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockTranscriptRepository.find.mockResolvedValue([
        {
          speaker: Speaker.PHYSICIAN,
          text: 'How are you',
          correctedText: null,
          confidence: 0.9,
          startTimestamp: 0,
          endTimestamp: 5,
        },
        {
          speaker: Speaker.PATIENT,
          text: 'I am fine',
          correctedText: null,
          confidence: 0.8,
          startTimestamp: 5,
          endTimestamp: 10,
        },
      ]);

      const stats = await service.getTranscriptStats('consul-001');

      expect(stats.totalSegments).toBe(2);
      expect(stats.physicianWords).toBe(3);
      expect(stats.patientWords).toBe(3);
      expect(stats.totalWords).toBe(6);
      expect(stats.duration).toBe(10);
      expect(stats.accuracy).toBeCloseTo(0.85);
    });
  });

  describe('getTranscriptPaginated', () => {
    it('should return paginated segments and total count', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockTranscriptRepository.findAndCount.mockResolvedValue([[{ id: 'seg-1' }], 1]);

      const result = await service.getTranscriptPaginated('consul-001', 0, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException if the consultation does not exist', async () => {
      mockConsultationRepository.findOne.mockResolvedValue(null);

      await expect(service.getTranscriptPaginated('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchTranscript', () => {
    it('should return segments whose text matches the keyword case-insensitively', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockTranscriptRepository.find.mockResolvedValue([
        { text: 'Patient reports chest pain', correctedText: null },
        { text: 'Patient is healthy', correctedText: null },
      ]);

      const results = await service.searchTranscript('consul-001', 'CHEST');

      expect(results).toHaveLength(1);
      expect(results[0].text).toContain('chest');
    });

    it('should throw BadRequestException for a too-short keyword', async () => {
      await expect(service.searchTranscript('consul-001', 'a')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteTranscript', () => {
    it('should soft-remove all segments for the consultation', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      const segments = [{ id: 'seg-1' }, { id: 'seg-2' }];
      mockTranscriptRepository.find.mockResolvedValue(segments);

      await service.deleteTranscript('consul-001');

      expect(mockTranscriptRepository.softRemove).toHaveBeenCalledWith(segments);
    });
  });

  describe('getLowConfidenceSegments', () => {
    it('should return only segments below the confidence threshold', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockTranscriptRepository.find.mockResolvedValue([
        { text: 'a', confidence: 0.5 },
        { text: 'b', confidence: 0.9 },
      ]);

      const result = await service.getLowConfidenceSegments('consul-001', 0.7);

      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.5);
    });
  });
});
