
const TMDB_API_KEY: string = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5ZDBhMzc2OWI3N2ZlZTQ0Y2ZiZjkxMmNkODRlNjJmMSIsIm5iZiI6MTYwNzA2MDAwNi43ODgsInN1YiI6IjVmYzljYTI2NjZhN2MzMDAzZjQ2NGYwYiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.BYNMgQw0RrmeJnEUAdKyHlQp1hBOcmy-WVuPda7NG54'; // 请在此处填入您的 TMDB API Key
const BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBResult {
    id: number;
    title?: string;
    name?: string; // For TV shows
    original_title?: string;
    original_name?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    overview: string;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    media_type: 'movie' | 'tv';
}

export const searchTMDB = async (query: string): Promise<TMDBResult | null> => {
    if (TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
        console.warn('TMDB_API_KEY is not set. Please set it in server/services/hotDramaService.ts');
        // return null; 
    }

    try {
        // Search for multi (movie and tv)
        const url = `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&language=zh-CN&include_adult=false`;
        const response = await fetch(url, {
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${TMDB_API_KEY}`
            }
        });
        if (!response.ok) {
            console.error(`TMDB API error: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            // Prefer exact match or high popularity
            // For now just return the first result that is movie or tv
            const result = data.results.find((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
            return result || null;
        }
        return null;
    } catch (error) {
        console.error('Error searching TMDB:', error);
        return null;
    }
};

export const getTMDBDetails = async (id: number, type: 'movie' | 'tv'): Promise<any> => {
    try {
        const url = `${BASE_URL}/${type}/${id}?language=zh-CN`;
        const response = await fetch(url, {
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${TMDB_API_KEY}`
            }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching TMDB details:', error);
        return null;
    }
}

