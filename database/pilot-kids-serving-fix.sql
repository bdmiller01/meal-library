-- Remove ambiguous legacy kid-serving notes from the three pilot recipes.
-- Use explicit, fully supported serving instructions instead.
BEGIN;
UPDATE public.meal_recipes SET details = jsonb_set(details, '{kids_serving_instructions}', to_jsonb('Serve the shredded chicken in warm tortillas, with beans and toppings on the side. No rice or extra batch preparation required.'::text), true) WHERE id='M01';
UPDATE public.meal_recipes SET details = jsonb_set(details, '{kids_serving_instructions}', to_jsonb('Serve the same salmon, rice and edamame in separate sections of the plate; offer the miso sauce on the side.'::text), true) WHERE id='M15';
UPDATE public.meal_recipes SET details = jsonb_set(details, '{kids_serving_instructions}', to_jsonb('Serve sliced chicken, pita and cut vegetables separately, with yogurt-tahini dressing on the side.'::text), true) WHERE id='M22';
COMMIT;
