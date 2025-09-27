export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ROBOFLOW_API_KEY;
    const modelId = process.env.ROBOFLOW_MODEL_ID;
    const version = process.env.ROBOFLOW_MODEL_VERSION ?? "1";

    if (!apiKey || !modelId) {
      return Response.json(
        { error: "Missing ROBOFLOW_API_KEY or ROBOFLOW_MODEL_ID" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { testImages, expectedResults } = body;

    if (!testImages || !Array.isArray(testImages)) {
      return Response.json(
        { error: "testImages array is required" },
        { status: 400 }
      );
    }

    console.log(`Running validation on ${testImages.length} test images`);

    const validationResults = await Promise.allSettled(
      testImages.map(async (testCase: any, index: number) => {
        try {
          const { imageUrl, expectedDetections } = testCase;
          
          if (!imageUrl) {
            throw new Error(`Test case ${index}: imageUrl is required`);
          }

          // Fetch the test image
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Test case ${index}: Failed to fetch image from ${imageUrl}`);
          }

          const imageBuffer = await imageResponse.arrayBuffer();
          const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

          // Create FormData for Roboflow
          const formData = new FormData();
          formData.append('file', imageBlob, `test_${index}.jpg`);

          const url =
            `https://detect.roboflow.com/${encodeURIComponent(modelId)}/${encodeURIComponent(version)}` +
            `?api_key=${encodeURIComponent(apiKey)}` +
            `&confidence=0.3` + // Lower confidence for validation
            `&overlap=0.5`;

          const rfResponse = await fetch(url, {
            method: "POST",
            body: formData,
          });

          if (!rfResponse.ok) {
            throw new Error(`Test case ${index}: Roboflow API error ${rfResponse.status}`);
          }

          const detectionData = await rfResponse.json();
          const predictions = detectionData.predictions || [];

          // Calculate validation metrics
          const validation = calculateValidationMetrics(predictions, expectedDetections);

          return {
            testCaseIndex: index,
            imageUrl,
            success: true,
            predictions,
            expectedDetections,
            validation
          };

        } catch (error: any) {
          return {
            testCaseIndex: index,
            imageUrl: testCase.imageUrl,
            success: false,
            error: error.message,
            validation: null
          };
        }
      })
    );

    // Calculate overall validation metrics
    const successfulTests = validationResults
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => (r as any).value);

    const overallMetrics = calculateOverallMetrics(successfulTests);

    return Response.json({
      summary: {
        totalTests: testImages.length,
        successfulTests: successfulTests.length,
        failedTests: testImages.length - successfulTests.length,
        overallAccuracy: overallMetrics.accuracy,
        overallPrecision: overallMetrics.precision,
        overallRecall: overallMetrics.recall,
        overallF1Score: overallMetrics.f1Score
      },
      results: validationResults.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Test failed' }),
      recommendations: generateRecommendations(overallMetrics, successfulTests)
    });

  } catch (e: any) {
    console.error("Validation API error:", e);
    return Response.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

function calculateValidationMetrics(predictions: any[], expectedDetections: any[]) {
  if (!expectedDetections || expectedDetections.length === 0) {
    return {
      accuracy: predictions.length === 0 ? 1.0 : 0.0,
      precision: 0.0,
      recall: 0.0,
      f1Score: 0.0,
      falsePositives: predictions.length,
      falseNegatives: 0,
      truePositives: 0
    };
  }

  // Simple validation based on class counts
  const predictedClasses = predictions.map(p => p.class);
  const expectedClasses = expectedDetections.map(e => e.class);

  const classCounts = {
    helmet: { predicted: 0, expected: 0 },
    vest: { predicted: 0, expected: 0 },
    'no-helmet': { predicted: 0, expected: 0 },
    'no-vest': { predicted: 0, expected: 0 }
  };

  // Count predicted classes
  predictedClasses.forEach(cls => {
    if (cls in classCounts) {
      classCounts[cls as keyof typeof classCounts].predicted++;
    }
  });

  // Count expected classes
  expectedClasses.forEach(cls => {
    if (cls in classCounts) {
      classCounts[cls as keyof typeof classCounts].expected++;
    }
  });

  // Calculate metrics
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  Object.entries(classCounts).forEach(([cls, counts]) => {
    const tp = Math.min(counts.predicted, counts.expected);
    const fp = Math.max(0, counts.predicted - counts.expected);
    const fn = Math.max(0, counts.expected - counts.predicted);

    truePositives += tp;
    falsePositives += fp;
    falseNegatives += fn;
  });

  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  const accuracy = (truePositives + (expectedDetections.length - falsePositives - falseNegatives)) / expectedDetections.length;

  return {
    accuracy: Math.round(accuracy * 1000) / 1000,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    f1Score: Math.round(f1Score * 1000) / 1000,
    falsePositives,
    falseNegatives,
    truePositives
  };
}

function calculateOverallMetrics(successfulTests: any[]) {
  if (successfulTests.length === 0) {
    return { accuracy: 0, precision: 0, recall: 0, f1Score: 0 };
  }

  const totalMetrics = successfulTests.reduce((acc, test) => {
    const metrics = test.validation;
    return {
      accuracy: acc.accuracy + metrics.accuracy,
      precision: acc.precision + metrics.precision,
      recall: acc.recall + metrics.recall,
      f1Score: acc.f1Score + metrics.f1Score
    };
  }, { accuracy: 0, precision: 0, recall: 0, f1Score: 0 });

  return {
    accuracy: Math.round((totalMetrics.accuracy / successfulTests.length) * 1000) / 1000,
    precision: Math.round((totalMetrics.precision / successfulTests.length) * 1000) / 1000,
    recall: Math.round((totalMetrics.recall / successfulTests.length) * 1000) / 1000,
    f1Score: Math.round((totalMetrics.f1Score / successfulTests.length) * 1000) / 1000
  };
}

function generateRecommendations(overallMetrics: any, successfulTests: any[]) {
  const recommendations = [];

  if (overallMetrics.accuracy < 0.8) {
    recommendations.push({
      type: 'accuracy',
      message: 'Model accuracy is below 80%. Consider retraining with more diverse data.',
      severity: 'high'
    });
  }

  if (overallMetrics.precision < 0.7) {
    recommendations.push({
      type: 'precision',
      message: 'High false positive rate detected. Consider increasing confidence threshold.',
      severity: 'medium'
    });
  }

  if (overallMetrics.recall < 0.7) {
    recommendations.push({
      type: 'recall',
      message: 'High false negative rate detected. Consider decreasing confidence threshold.',
      severity: 'medium'
    });
  }

  if (overallMetrics.f1Score < 0.75) {
    recommendations.push({
      type: 'f1score',
      message: 'Overall F1 score is low. Model may need retraining or parameter tuning.',
      severity: 'high'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: 'Model performance is good. Continue monitoring with regular validation.',
      severity: 'low'
    });
  }

  return recommendations;
}

