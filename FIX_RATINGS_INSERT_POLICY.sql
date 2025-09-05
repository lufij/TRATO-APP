-- 🔥 EJECUTAR ESTA LÍNEA SOLA:

CREATE POLICY "Users can insert own ratings" ON ratings
    FOR INSERT 
    WITH CHECK (auth.uid() = rater_id);
