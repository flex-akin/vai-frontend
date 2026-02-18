import { data } from "react-router-dom";
import axiosClient from "../http/axiosClient";

export type PipelineResponse = {
  video_transcript: {
    language: string;
    text: string;
    segments: Array<{
      idx: number;
      start_ms: number;
      end_ms: number;
      text: string;
      sentiment: {
        label: string;
        score: number;
      };
    }>;
    overall_sentiment: {
      signed_avg: number;
      pos: number;
      neu: number;
      neg: number;
    };
  };
  viewer_transcript: {
    language: string;
    text: string;
    segments: Array<{
      idx: number;
      start_ms: number;
      end_ms: number;
      text: string;
      sentiment: {
        label: string;
        score: number;
      };
    }>;
    overall_sentiment: {
      signed_avg: number;
      pos: number;
      neu: number;
      neg: number;
    };
  };
  intent_analysis: {
    scene_summary: string;
    viewer_text: string;
    video_sentiment: {
      label: string;
      score: number;
    };
    viewer_sentiment: {
      label: string;
      score: number;
    };
    decision: {
      action: string;
      confidence: number;
      parameters: Record<string, any>;
      explain: string;
      prompt_request?: any;
    };
  };
  extracted_image_path: string;
  veo3_prompt: string;
  generated_video_path: string;
  file_size_mb: number;
  processing_time_seconds: number;
};

export type PipelineOptions = {
  rewind_secs?: number;
  skip_secs?: number;
};

/**
 * Call the pipeline endpoint to process viewer audio against the video
 * This is a long-running operation (~2 minutes)
 */
export const callVideoPipeline = async (
  videoId: string | number,
  viewerAudio: File,
  opts: PipelineOptions = {}
): Promise<PipelineResponse> => {
  const form = new FormData();
  form.append("video_id", String(videoId));
  form.append("viewer_audio", viewerAudio);
  form.append("rewind_secs", String(opts.rewind_secs ?? 8));
  form.append("skip_secs", String(opts.skip_secs ?? 20));

  console.log("Calling pipeline endpoint with:", {
    videoId,
    audioFile: viewerAudio.name,
    rewind_secs: opts.rewind_secs ?? 8,
    skip_secs: opts.skip_secs ?? 20,
  });

  const res = await axiosClient.post<PipelineResponse>(
    "/api/v1/pipeline/from-db",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 10 * 60 * 1000, // 10 minute timeout for the long-running operation
    }
  );
  // const res = {
  //   data: {
  //     video_transcript: {
  //       language: "en",
  //       text: "This is the transcribed text from the original video.",
  //       segments: [
  //         {
  //           idx: 0,
  //           start_ms: 0,
  //           end_ms: 3000,
  //           text: "This is the transcribed text from the original video.",
  //           sentiment: {
  //             label: "neutral",
  //             score: 0.5
  //           }
  //         }
  //       ],
  //       overall_sentiment: {
  //         signed_avg: 0.2,
  //         pos: 0.4,
  //         neu: 0.5,
  //         neg: 0.1
  //       }
  //     },
  //     viewer_transcript: {
  //       language: "en",
  //       text: "That was an interesting video, I really enjoyed it!",
  //       segments: [
  //         {
  //           idx: 0,
  //           start_ms: 0,
  //           end_ms: 4000,
  //           text: "That was an interesting video, I really enjoyed it!",
  //           sentiment: {
  //             label: "positive",
  //             score: 0.85
  //           }
  //         }
  //       ],
  //       overall_sentiment: {
  //         signed_avg: 0.75,
  //         pos: 0.85,
  //         neu: 0.1,
  //         neg: 0.05
  //       }
  //     },
  //     intent_analysis: {
  //       scene_summary: "A person watching a video and reacting positively to the content",
  //       viewer_text: "That was an interesting video, I really enjoyed it!",
  //       video_sentiment: {
  //         label: "neutral",
  //         score: 0.5
  //       },
  //       viewer_sentiment: {
  //         label: "positive",
  //         score: 0.85
  //       },
  //       decision: {
  //         action: "create_reaction_video",
  //         confidence: 0.92,
  //         parameters: {
  //           duration: 30,
  //           style: "reaction",
  //           emotion: "enthusiastic"
  //         },
  //         explain: "User expressed high engagement and positive sentiment. Generating a reaction video to capture their enthusiasm.",
  //         prompt_request: {
  //           model: "veo3",
  //           prompt: "A person expressing joy and enthusiasm while reacting to interesting content"
  //         }
  //       }
  //     },
  //     extracted_image_path: "/generated/extracted_frame_12345.jpg",
  //     veo3_prompt: "A person expressing joy and enthusiasm while reacting to interesting content",
  //     generated_video_path: "https://danber-131831409744-kidz.s3.amazonaws.com/1770654893_6fa03dad-45cf-4f75-86b2-8224710c12f8.mp4",
  //     file_size_mb: 45.3,
  //     processing_time_seconds: 125.4
  //   }
  // }
  
  // Simulate API call delay - wait 10 seconds before returning
  // await new Promise(resolve => setTimeout(resolve, 10000));
  
  return res.data;
};
