import { supabase } from "../api/supabase";

export async function convertInquiryToStudent(
  inquiry
) {
  try {
    // 1. Create Parent

    const {
      data: parent,
      error: parentError,
    } = await supabase
      .from("parents")
      .insert([
        {
          father_name:
            inquiry.parent_name,

          mobile:
            inquiry.mobile,

          whatsapp:
            inquiry.whatsapp,
        },
      ])
      .select()
      .single();

    if (parentError)
      throw parentError;

    // 2. Create Student

    const admissionNo =
      `SVA-${Date.now()}`;

    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("students")
      .insert([
        {
          admission_no:
            admissionNo,

          first_name:
            inquiry.student_name,

          mobile:
            inquiry.mobile,

          joining_date:
            new Date(),
        },
      ])
      .select()
      .single();

    if (studentError)
      throw studentError;

    // 3. Create Mapping

    const { error: mappingError } =
      await supabase
        .from(
          "student_parents"
        )
        .insert([
          {
            student_id:
              student.id,

            parent_id:
              parent.id,

            relation:
              "Father",
          },
        ]);

    if (mappingError)
      throw mappingError;

    // 4. Update Inquiry

    const { error: inquiryError } =
      await supabase
        .from("inquiries")
        .update({
          status:
            "Joined",
        })
        .eq(
          "id",
          inquiry.id
        );

    if (inquiryError)
      throw inquiryError;

    return {
      success: true,
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      error,
    };
  }
}