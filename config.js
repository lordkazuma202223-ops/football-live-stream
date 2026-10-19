/* ============================================================
   Supabase configuration
   ------------------------------------------------------------
   Fill in the two values below from your Supabase project:
     Supabase Dashboard -> Project Settings -> API
       - "Project URL"        -> url
       - "anon public" key    -> anonKey   (starts with eyJ...)
   Then run the SQL shown in the chat to create the `visitors` table.
   ============================================================ */
window.SUPABASE_CONFIG = {
    url: 'https://nwdxmzbaazyeuxfzitdq.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZHhtemJhYXp5ZXV4ZnppdGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzODgxODUsImV4cCI6MjEwNzk2NDE4NX0.smBZALNy3ppZTq2orwRZzzWbpH52KpZlTDYKQLWLono',
    table: 'visitors'
};
