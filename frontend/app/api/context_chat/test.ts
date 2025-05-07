import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Uploads a PDF file to Supabase storage
 * @param file PDF file to upload
 * @returns Public URL of the uploaded file
 */
export async function uploadPDFToSupabase(file: File): Promise<string | null> {
  try {
    // Generate a unique file name to avoid collisions
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    
    // Upload the file to the 'pdfs' bucket
    const { data, error } = await supabase.storage
      .from('pdfs')
      .upload(`documents/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false,
      });
      
    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('pdfs')
      .getPublicUrl(`documents/${fileName}`);
      
    return urlData.publicUrl;
  } catch (error) {
    console.error('Supabase upload error:', error);
    return null;
  }
}

/**
 * Queries the context chat API with a PDF from Supabase
 * @param supabaseUrl URL to the PDF in Supabase storage
 * @param query Question to ask about the PDF
 * @returns Answer from the context chat API
 */
export async function queryContextWithSupabasePDF(
  supabaseUrl: string,
  query: string
): Promise<{ answer?: string; error?: string }> {
  try {
    const response = await fetch('/api/context_chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supabaseUrl,
        query,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Context chat query error:', error);
    return { error: error.message };
  }
}

/**
 * Example function showing the full workflow from upload to query
 * @param pdfFile PDF file to analyze
 * @param query Question to ask about the PDF
 */
export async function uploadAndQueryPDF(
  pdfFile: File,
  query: string
): Promise<{ answer?: string; error?: string }> {
  try {
    // Step 1: Upload to Supabase
    const supabaseUrl = await uploadPDFToSupabase(pdfFile);
    
    if (!supabaseUrl) {
      return { error: 'Failed to upload PDF to Supabase' };
    }
    
    // Step 2: Query the context chat API
    return await queryContextWithSupabasePDF(supabaseUrl, query);
  } catch (error: any) {
    return { error: error.message };
  }
}

// Example usage in a React component:
/*
import { uploadAndQueryPDF } from './api/context_chat/test';

function PDFQueryComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ answer?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !query) return;
    
    setLoading(true);
    try {
      const response = await uploadAndQueryPDF(file, query);
      setResult(response);
    } catch (error) {
      console.error(error);
      setResult({ error: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input 
          type="file" 
          accept=".pdf" 
          onChange={(e) => setFile(e.target.files?.[0] || null)} 
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about the PDF..."
        />
        <button type="submit" disabled={loading || !file || !query}>
          {loading ? 'Processing...' : 'Submit'}
        </button>
      </form>
      
      {result && (
        <div>
          {result.error ? (
            <div className="error">{result.error}</div>
          ) : (
            <div className="answer">{result.answer}</div>
          )}
        </div>
      )}
    </div>
  );
}
*/ 