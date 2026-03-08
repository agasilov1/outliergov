
-- Fix RLS policy role scoping: change from public to authenticated

-- 1. provider_attributes
DROP POLICY "Authenticated users can view provider attributes" ON public.provider_attributes;
CREATE POLICY "Authenticated users can view provider attributes" ON public.provider_attributes FOR SELECT TO authenticated USING (true);

-- 2. peer_group_stats
DROP POLICY "Authenticated users can view peer group stats" ON public.peer_group_stats;
CREATE POLICY "Authenticated users can view peer group stats" ON public.peer_group_stats FOR SELECT TO authenticated USING (true);

-- 3. peer_group_definitions
DROP POLICY "Authenticated users can view peer group definitions" ON public.peer_group_definitions;
CREATE POLICY "Authenticated users can view peer group definitions" ON public.peer_group_definitions FOR SELECT TO authenticated USING (true);

-- 4. specialty_map
DROP POLICY "Authenticated users can view specialty map" ON public.specialty_map;
CREATE POLICY "Authenticated users can view specialty map" ON public.specialty_map FOR SELECT TO authenticated USING (true);

-- 5. anomaly_flags_v2
DROP POLICY "Authenticated users can view flagged anomalies" ON public.anomaly_flags_v2;
CREATE POLICY "Authenticated users can view flagged anomalies" ON public.anomaly_flags_v2 FOR SELECT TO authenticated USING ((flagged = true) OR has_role(auth.uid(), 'admin'::app_role));

-- 6. anomaly_flag_years
DROP POLICY "Authenticated users can view anomaly flag years" ON public.anomaly_flag_years;
CREATE POLICY "Authenticated users can view anomaly flag years" ON public.anomaly_flag_years FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM anomaly_flags_v2 af WHERE af.id = anomaly_flag_years.anomaly_flag_id AND (af.flagged = true OR has_role(auth.uid(), 'admin'::app_role))));

-- 7. dataset_releases
DROP POLICY "Authenticated users can view active releases" ON public.dataset_releases;
CREATE POLICY "Authenticated users can view active releases" ON public.dataset_releases FOR SELECT TO authenticated USING ((status = 'active'::text) OR has_role(auth.uid(), 'admin'::app_role));

-- 8. terms_acceptances (INSERT + SELECT)
DROP POLICY "Users can insert own acceptances" ON public.terms_acceptances;
CREATE POLICY "Users can insert own acceptances" ON public.terms_acceptances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can view own acceptances" ON public.terms_acceptances;
CREATE POLICY "Users can view own acceptances" ON public.terms_acceptances FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 9. watchlist_items (INSERT + SELECT + DELETE)
DROP POLICY "Users can add to own watchlist" ON public.watchlist_items;
CREATE POLICY "Users can add to own watchlist" ON public.watchlist_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can view own watchlist" ON public.watchlist_items;
CREATE POLICY "Users can view own watchlist" ON public.watchlist_items FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Users can remove from own watchlist" ON public.watchlist_items;
CREATE POLICY "Users can remove from own watchlist" ON public.watchlist_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
