import { supabase } from './supabase';
import { Subscriber } from '../types';

export type AiFeatureType = 'chat' | 'analysis';

const DAILY_LIMITS: Record<AiFeatureType, number> = {
  chat: 5,
  analysis: 1,
};

export const getUserSubscription = async (userId: string): Promise<Subscriber | null> => {
  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;
  return data as Subscriber | null;
};

export const isPremiumSubscriber = (subscription: Subscriber | null): boolean => {
  if (!subscription) return false;
  if (!subscription.subscribed) return false;
  return (subscription.subscription_tier || '').toLowerCase() === 'premium';
};

export const getDailyLimit = (feature: AiFeatureType, isPremium: boolean): number => {
  return isPremium ? Number.POSITIVE_INFINITY : DAILY_LIMITS[feature];
};


export const isAdminUser = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) return false;
  return !!data;
};
