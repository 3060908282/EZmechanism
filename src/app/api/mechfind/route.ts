import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch('http://localhost:3002/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Prediction failed' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const rawData = await response.json();

    // Transform the backend response to match the frontend's expected format
    const solutions = rawData.solutions || [];
    const similarity = rawData.similarity || [];
    const mechanismMatrix = rawData.mechanism_matrix || null;
    const metadata = rawData.metadata || {};

    // Build mechanisms list
    const mechanisms = solutions.map((solution: string | string[], idx: number) => {
      const isString = typeof solution === 'string';
      const rules = isString ? [solution] : solution;
      const simInfo = similarity[idx] || { score: 0, top_matches: {} };

      // Transform M-CSA matches
      const mcsaMatches = Object.entries(simInfo.top_matches || {}).map(
        ([mcsaId, score]) => ({
          mcsa_id: mcsaId,
          score: score as number,
        })
      );

      return {
        rank: idx + 1,
        similarity: simInfo.score || 0,
        rules: rules,
        mcsa_matches: mcsaMatches,
      };
    });

    // Build matrix data
    let matrix = { moieties: [], columns: [], rows: [] };
    if (mechanismMatrix) {
      matrix = {
        moieties: mechanismMatrix.index || [],
        columns: mechanismMatrix.columns || [],
        rows: mechanismMatrix.data || [],
      };
    }

    // Build summary
    const summary = {
      computation_time: metadata.elapsed_time || 0,
      num_solutions: metadata.num_solutions || 0,
      parameters: {
        reaction: metadata.reaction || '',
        radius: metadata.radius || 0,
        max_steps: metadata.max_steps || 0,
        iterations: metadata.iterations || 0,
        time_limit: metadata.time_limit || 0,
      },
    };

    return NextResponse.json({ mechanisms, matrix, summary });
  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to MechFind backend service' },
      { status: 502 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch('http://localhost:3002/api/examples');
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch examples' },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Examples API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to MechFind backend service' },
      { status: 502 }
    );
  }
}
