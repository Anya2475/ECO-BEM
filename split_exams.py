import os
from PyPDF2 import PdfReader, PdfWriter

# المسار الرئيسي لمجلد بنك الأسئلة
base_dir = r"C:\Users\chatt\Desktop\ECO-BEM\بنك"

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".pdf"):
            pdf_path = os.path.join(root, file)
            # استخراج اسم المادة من اسم المجلد الحالي
            subject = os.path.basename(root)
            # استخراج السنة من اسم الملف
            year = file.replace(".pdf", "")
            
            try:
                reader = PdfReader(pdf_path)
                # التأكد من وجود صفحتين على الأقل (سؤال وإجابة)
                if len(reader.pages) >= 2:
                    # إنشاء مجلد "مفصول" داخل مجلد المادة
                    output_dir = os.path.join(root, "مفصول")
                    if not os.path.exists(output_dir):
                        os.makedirs(output_dir)
                        
                    # فصل السؤال (الصفحة الأولى)
                    q_writer = PdfWriter()
                    q_writer.add_page(reader.pages[0])
                    with open(os.path.join(output_dir, f"{subject}_{year}_Question.pdf"), "wb") as q_file:
                        q_writer.write(q_file)
                        
                    # فصل الإجابة النموذجية (الصفحة الثانية)
                    a_writer = PdfWriter()
                    a_writer.add_page(reader.pages[1])
                    with open(os.path.join(output_dir, f"{subject}_{year}_Answer.pdf"), "wb") as a_file:
                        a_writer.write(a_file)
                        
                    print(f"تم فصل ملف: {subject} - {year}")
            except Exception as e:
                print(f"حدث خطأ في ملف {file}: {e}")

print("تمت العملية بنجاح!")