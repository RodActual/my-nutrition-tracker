/**
 * Mifflin-St Jeor Equation & Macro Calculation
 * This is the engine that drives your daily calorie/macro goals.
 */

export const calculateTargets = (weightKg, heightCm, age, gender, activityLevel = 1.2, goal = 'maintain') => {
  // 🛠️ FIX 1: Ensure activityLevel is a number (Select inputs often return strings)
  const numericActivity = parseFloat(activityLevel);
  const numericAge = parseInt(age);
  
  // Safety check: If any value is invalid, return a safe default to prevent a crash
  if (isNaN(weightKg) || isNaN(heightCm) || isNaN(numericAge)) {
    console.warn("Invalid inputs detected in calculateTargets");
    return { calories: 2000, protein: 150, carbs: 200, fats: 70 };
  }

  // 1. Calculate Basal Metabolic Rate (BMR)
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * numericAge);
  
  // Sex modifier: +5 for males, -161 for females
  // 🛠️ FIX 2: Use .toLowerCase() so "Female" or "female" both work
  bmr = gender.toLowerCase() === 'male' ? bmr + 5 : bmr - 161;

  // 2. Adjust for Activity Level (TDEE)
  const tdee = Math.round(bmr * numericActivity);

  // 3. Adjust for Goal
  let targetCalories = tdee;
  if (goal === 'lose') targetCalories -= 500;
  if (goal === 'gain') targetCalories += 500;

  // 4. Macro Split (30% Protein, 40% Carbs, 30% Fats)
  return {
    calories: targetCalories,
    protein: Math.round((targetCalories * 0.30) / 4),
    carbs: Math.round((targetCalories * 0.40) / 4),
    fats: Math.round((targetCalories * 0.30) / 9),
    updatedAt: new Date().toISOString()
  };
};

// Conversion Helpers
export const lbsToKg = (lbs) => parseFloat(lbs) * 0.453592;

// 🛠️ FIX 3: Changed 'inches' to 'inch' to match the modal's variable names
export const ftInToCm = (ft, inch) => (parseInt(ft) * 30.48) + (parseInt(inch) * 2.54);
