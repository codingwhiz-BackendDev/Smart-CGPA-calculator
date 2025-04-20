# views.py
import csv
import io
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import pandas as pd

def index(request): 
    return render(request, 'index.html')

@csrf_exempt
def calculate_cgpa(request): 
    if request.method == 'POST' and request.FILES.get('cgpa_file'):
        csv_file = request.FILES['cgpa_file']
        
        # Check if file is CSV
        if not csv_file.name.endswith('.csv'):
            return JsonResponse({'error': 'Please upload a CSV file'}, status=400)
        
        # Try to decode and process the file
        try:
            # Process with pandas for better handling
            data = pd.read_csv(csv_file)
            
            # Extract relevant columns for calculation
            students_data = []
            
            # Group students by ID to handle duplicate entries
            for student_id, student_group in data.groupby('StudentID'):
                student_name = student_group['Name'].iloc[0]
                
                # Calculate total grade points and total units
                total_grade_points = 0
                total_units = 0
                courses = []
                
                # Process each course for this student
                for _, row in student_group.iterrows():
                    # Extract courses dynamically (handles multiple courses per student)
                    course_cols = [col for col in row.index if col.startswith('Course')]
                    grade_cols = [col for col in row.index if col.startswith('Grade')]
                    unit_cols = [col for col in row.index if col.startswith('Unit')]
                    
                    for i in range(len(course_cols)):
                        try:
                            course_code = row[course_cols[i]]
                            grade_value = float(row[grade_cols[i]])
                            unit_value = float(row[unit_cols[i]])
                            
                            # Convert numeric grade to letter and points based on school grading system
                            grade_letter, grade_point = convert_grade_to_letter_and_points(grade_value)
                            
                            # Calculate weighted grade points: grade_point × unit_value
                            weighted_grade = grade_point * unit_value
                            
                            total_grade_points += weighted_grade
                            total_units += unit_value
                            
                            courses.append({
                                'code': course_code,
                                'raw_grade': grade_value,
                                'grade_letter': grade_letter,
                                'unit': unit_value,
                                'grade_point': grade_point,
                                'weighted_grade': weighted_grade
                            })
                        except (ValueError, KeyError):
                            # Skip invalid entries
                            continue
                
                # Calculate CGPA according to school system: Total Grade Points / Total Units
                cgpa = round(total_grade_points / total_units, 2) if total_units > 0 else 0
                
                students_data.append({
                    'student_id': student_id,
                    'name': student_name,
                    'courses': courses,
                    'total_units': total_units,
                    'total_grade_points': total_grade_points,
                    'cgpa': cgpa
                })
            
            # Return calculated data
            return JsonResponse({
                'status': 'success',
                'students': students_data
            })
            
        except Exception as e:
            return JsonResponse({'error': f'Error processing file: {str(e)}'}, status=400)
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

def convert_grade_to_letter_and_points(grade):
    """
    Convert numerical grade to letter grade and grade points
    According to the school's grading system:
    70+ = A = 5 points
    60-69 = B = 4 points
    50-59 = C = 3 points
    40-49 = D = 2 points
    <40 = F = 0 points
    """
    if grade >= 70:
        return 'A', 5.0
    elif grade >= 60:
        return 'B', 4.0
    elif grade >= 50:
        return 'C', 3.0
    elif grade >= 40:
        return 'D', 2.0
    else:
        return 'F', 0.0

def download_sample_csv(request):
    """Provide a sample CSV file for users to download"""
    sample_content = """StudentID,Name,Course1,Grade1,Unit1,Course2,Grade2,Unit2,Course3,Grade3,Unit3
STU001,John Doe,MTH101,85,3,PHY101,76,4,CHM101,82,3
STU002,Jane Smith,MTH101,90,3,PHY101,82,4,CHM101,88,3
"""
    
    response = HttpResponse(sample_content, content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="sample_grades.csv"'
    return response