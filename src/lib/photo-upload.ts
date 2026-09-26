import type { SupabaseClient } from '@supabase/supabase-js';

// Upload une photo dans le bucket public "aquarium-photos", sous
// <user_id>/<folder>/... — la politique RLS du bucket exige que le premier
// segment du chemin soit l'id de l'utilisateur connecté.
export async function uploadPhoto(
  supabase: SupabaseClient,
  userId: string,
  folder: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${folder}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage
    .from('aquarium-photos')
    .upload(path, file, { contentType: file.type || 'image/jpeg' });
  if (error) throw error;
  const { data } = supabase.storage.from('aquarium-photos').getPublicUrl(path);
  return data.publicUrl;
}
