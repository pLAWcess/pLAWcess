-- 멘토도 멘티처럼 정량 데이터 입력(LEET 영역별 점수 / 전공·환산 평점 / 어학)을 저장할 수 있도록
-- mentor_records 에 정량 필드를 추가한다. MenteeRecord 의 2단계 정량 블록과 동일한 컬럼.
-- (leet_score / gpa / leet_exam_year / has_law_class / law_class_subjects / is_special_admission 는 기존 컬럼 유지.)

ALTER TABLE "mentor_records" ADD COLUMN "gpa_major" DECIMAL(3,2);
ALTER TABLE "mentor_records" ADD COLUMN "gpa_converted" DECIMAL(5,2);
ALTER TABLE "mentor_records" ADD COLUMN "leet_verbal_raw" INTEGER;
ALTER TABLE "mentor_records" ADD COLUMN "leet_verbal_standard" INTEGER;
ALTER TABLE "mentor_records" ADD COLUMN "leet_verbal_percentile" DECIMAL(5,2);
ALTER TABLE "mentor_records" ADD COLUMN "leet_reasoning_raw" INTEGER;
ALTER TABLE "mentor_records" ADD COLUMN "leet_reasoning_standard" INTEGER;
ALTER TABLE "mentor_records" ADD COLUMN "leet_reasoning_percentile" DECIMAL(5,2);
ALTER TABLE "mentor_records" ADD COLUMN "toeic_score" INTEGER;
ALTER TABLE "mentor_records" ADD COLUMN "toefl_score" INTEGER;
ALTER TABLE "mentor_records" ADD COLUMN "teps_score" INTEGER;
