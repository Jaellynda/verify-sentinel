import { useState, useEffect } from 'react';
import { supabase } from '@/api/base44Client';

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If account type was set during login, save it now
      const pendingType = localStorage.getItem('pending_account_type');
      if (pendingType && data) {
        await supabase.from('profiles')
          .update({ account_type: pendingType })
          .eq('id', user.id);
        localStorage.removeItem('pending_account_type');
        setProfile({ ...data, account_type: pendingType });
      } else {
        setProfile(data);
      }
      setLoading(false);
    })();
  }, []);

  return { profile, loading };
}
