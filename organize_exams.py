import os
import shutil
import re

# مسار مجلد بنك الأسئلة الحالي
base_dir = r"C:\Users\chatt\Desktop\ECO-BEM\بنك"
# مسار المجلد الجديد الذي سيحتوي على الملفات المنظمة
output_base = r"C:\Users\chatt\Desktop\ECO-BEM\بنك_منظم"

if not os.path.exists(output_base):
    os.makedirs(output_base)

for root, dirs, files in os.walk(base_dir):
    # تخطي أي مجلدات باسم "مفصول" إن وجدت
    if 'مفصول' in root:
        continue
        
    for file in files:
        if file.endswith(".pdf"):
            file_lower = file.lower()
            
            # تحديد ما إذا كان الملف للإجابة أو للسؤال بناءً على اسمه
            if 'correction' in file_lower or 'corrig' in file_lower or 'تصحيح' in file_lower or 'حل' in file_lower:
                file_type = "Answer"
            else:
                file_type = "Question"
            
            # استخراج السنة من اسم الملف (أرقام تبدأ بـ 20)
            year_match = re.search(r'(20\d{2})', file)
            year = year_match.group(1) if year_match else "UnknownYear"
            
            # استخراج اسم المادة من المجلد الرئيسي للمادة (مباشرة داخل "بنك")
            rel_path = os.path.relpath(root, base_dir)
            subject = rel_path.split(os.sep)[0]
            
            if subject == '.': 
                continue # تخطي الملفات الموجودة مباشرة في المجلد الرئيسي بدون مادة
            
            # إنشاء الاسم الجديد
            new_filename = f"{subject}_{year}_{file_type}.pdf"
            
            # إنشاء مجلد المادة في المجلد المنظم الجديد
            subject_out_dir = os.path.join(output_base, subject)
            if not os.path.exists(subject_out_dir):
                os.makedirs(subject_out_dir)
                
            old_path = os.path.join(root, file)
            new_path = os.path.join(subject_out_dir, new_filename)
            
            # نسخ الملف باسمه ومكانه الجديدين
            shutil.copy2(old_path, new_path)
            print(f"تم تنظيم ملف: {new_filename}")

print("تمت عملية التنظيم وإعادة التسمية بنجاح! تجد الملفات في مجلد 'بنك_منظم'")