import { Subject, TopicProgress } from "./types";

export const generateInitialProgress = (
  subjects: Subject[],
): Record<string, TopicProgress> => {
  const result: Record<string, TopicProgress> = {};
  for (const subject of subjects) {
    for (const topic of subject.topics) {
      result[topic.id] = {
        topicId:      topic.id,
        proficiency:  0,
        correctCount: 0,
        wrongCount:   0,
        studyCount:   0,
        weakFlag:     false,
        lastStudied:  new Date().toISOString(),
      };
    }
  }
  return result;
};
