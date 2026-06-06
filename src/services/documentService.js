import { supabase } from "../api/supabase";

// Get all documents for a student
export async function getStudentDocuments(studentId) {
  const { data, error } = await supabase
    .from("student_documents")
    .select("*")
    .eq("student_id", studentId)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;
  return data;
}

// Upload a document file + create database record
export async function uploadStudentDocument(studentId, file, documentType) {
  // 1. Upload file to storage
  const filePath = `${studentId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("student-documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // 2. Get public URL
  const { data: urlData } = supabase.storage
    .from("student-documents")
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  // 3. Insert record into student_documents
  const { data, error: dbError } = await supabase
    .from("student_documents")
    .insert([
      {
        student_id: studentId,
        document_type: documentType,
        file_name: file.name,
        file_path: publicUrl,
      },
    ])
    .select()
    .single();

  if (dbError) throw dbError;
  return data;
}

// Delete document (file + record)
export async function deleteStudentDocument(documentId, filePath) {
  // 1. Delete from storage
  const { error: storageError } = await supabase.storage
    .from("student-documents")
    .remove([filePath]);

  if (storageError) throw storageError;

  // 2. Delete record
  const { error } = await supabase
    .from("student_documents")
    .delete()
    .eq("id", documentId);

  if (error) throw error;
}