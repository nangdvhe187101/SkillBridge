import Cocoa
import Vision
import Foundation

// Script: student_card_ocr.swift
// Input: Image file path as argv[1]
// Output: JSON string with extracted student card fields

guard CommandLine.arguments.count > 1 else {
    print("{\"error\": \"Missing image path argument\"}")
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let imageURL = URL(fileURLWithPath: imagePath)

guard let image = NSImage(contentsOf: imageURL),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("{\"error\": \"Cannot open image at \(imagePath)\"}")
    exit(1)
}

struct TextBlock {
    let text: String
    let bbox: CGRect
}

var blocks: [TextBlock] = []
var recognizedLines: [String] = []

let request = VNRecognizeTextRequest { (request, error) in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    for obs in observations {
        if let topCandidate = obs.topCandidates(1).first {
            let text = topCandidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
            if !text.isEmpty {
                recognizedLines.append(text)
                blocks.append(TextBlock(text: text, bbox: obs.boundingBox))
            }
        }
    }
}

request.recognitionLevel = .accurate
request.recognitionLanguages = ["vi-VN", "en-US"]
request.usesLanguageCorrection = true

let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try requestHandler.perform([request])
} catch {
    print("{\"error\": \"Vision request failed: \(error.localizedDescription)\"}")
    exit(1)
}

// Hàm chuẩn hóa dấu tiếng Việt
func removeAccents(_ str: String) -> String {
    return str.folding(options: .diacriticInsensitive, locale: .current)
        .replacingOccurrences(of: "Đ", with: "D")
        .replacingOccurrences(of: "đ", with: "d")
}

func cleanNameToken(_ text: String) -> String {
    let letters = text.filter { $0.isLetter }
    let asciiLetters = letters.filter { $0.isASCII }
    // Nếu đa số chữ cái là không dấu (ASCII), chuẩn hóa toàn bộ về chữ không dấu chuẩn
    if letters.count > 0 && Double(asciiLetters.count) / Double(letters.count) >= 0.6 {
        return removeAccents(text)
    }
    return text
}

// Bỏ qua các nhãn hệ thống cố định
func isSystemLabel(_ text: String) -> Bool {
    let clean = removeAccents(text.lowercased())
    return clean.contains("truong dai hoc") || clean.contains("dai hoc") || clean.contains("cao dang")
        || clean.contains("university") || clean.contains("education") || clean.contains("student id")
        || clean.contains("period of study") || clean.contains("student") || clean.count <= 1
}

// Logic trích xuất thông tin
var extractedStudentCode: String? = nil
var extractedFullName: String? = nil
var extractedSchool: String? = nil
var extractedGradYear: Int? = nil

// 1. Tìm Student Code (HE191183, SE..., QE..., B21..., hoặc dạng có tiền tố Student ID / MSSV)
let studentCodeRegexes = [
    #"(?:Student\s*ID|MSSV|Mã\s*(?:số)?\s*sinh\s*viên)[:\s]*([A-Za-z]{1,4}\d{4,8})"#,
    #"\b([A-Za-z]{2}\d{6,8})\b"#,
    #"\b([A-Za-z]{1,3}\d{5,8})\b"#,
    #"\b(\d{7,10})\b"#
]

for line in recognizedLines {
    for pattern in studentCodeRegexes {
        if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: line, options: [], range: NSRange(location: 0, length: line.utf16.count)) {
            let captureRange = match.numberOfRanges > 1 ? match.range(at: 1) : match.range
            if let swiftRange = Range(captureRange, in: line) {
                let code = String(line[swiftRange]).uppercased()
                if extractedStudentCode == nil && code.count >= 6 {
                    extractedStudentCode = code
                    break
                }
            }
        }
    }
    if extractedStudentCode != nil { break }
}

// 2. Tìm Trường học
for line in recognizedLines {
    let lower = line.lowercased()
    if lower.contains("fpt") {
        extractedSchool = "Đại học FPT"
        break
    } else if lower.contains("bách khoa") || lower.contains("bach khoa") || lower.contains("hust") {
        extractedSchool = "Đại học Bách Khoa"
        break
    } else if lower.contains("quốc gia") || lower.contains("vnu") {
        extractedSchool = "Đại học Quốc Gia"
        break
    } else if lower.contains("kinh tế") || lower.contains("neu") {
        extractedSchool = "Đại học Kinh tế Quốc dân"
        break
    } else if lower.contains("đại học") || lower.contains("cao đẳng") || lower.contains("university") {
        extractedSchool = line
        break
    }
}

// 3. Tìm Niên khóa / Năm tốt nghiệp (vd: 2023-2027 -> 2027)
let yearRegex = #"(?:20\d{2})\s*[-–/]\s*(20\d{2})"#
for line in recognizedLines {
    if let regex = try? NSRegularExpression(pattern: yearRegex, options: []),
       let match = regex.firstMatch(in: line, options: [], range: NSRange(location: 0, length: line.utf16.count)),
       match.numberOfRanges > 1,
       let swiftRange = Range(match.range(at: 1), in: line),
       let year = Int(String(line[swiftRange])) {
        extractedGradYear = year
        break
    }
}

// 4. Tìm Họ tên (Hỗ trợ họ tên đa dòng và chuẩn hóa ký tự nhầm dấu)
let sortedBlocks = blocks.sorted { $0.bbox.origin.y > $1.bbox.origin.y }

var nameBlocks: [TextBlock] = []
var primaryName: TextBlock? = nil

for b in sortedBlocks {
    if isSystemLabel(b.text) { continue }
    let words = b.text.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }
    let isAllUpper = b.text == b.text.uppercased()
    
    if isAllUpper && words.count >= 2 && words.count <= 5 && primaryName == nil {
        primaryName = b
        nameBlocks.append(b)
        break
    }
}

if let prime = primaryName {
    let primeCenterX = prime.bbox.origin.x + prime.bbox.size.width / 2.0
    
    for b in sortedBlocks {
        if b.text == prime.text { continue }
        if isSystemLabel(b.text) { continue }
        
        let bCenterX = b.bbox.origin.x + b.bbox.size.width / 2.0
        let centerDiff = abs(primeCenterX - bCenterX)
        let yGap = prime.bbox.origin.y - (b.bbox.origin.y + b.bbox.size.height)
        let words = b.text.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }
        
        // Dòng tiếp theo của tên: căn lề tương đương (centerDiff < 0.15), nằm ngay sát bên dưới (yGap < 0.04), từ 1-3 từ, in hoa
        if yGap >= -0.015 && yGap < 0.045 && centerDiff < 0.15 && words.count >= 1 && words.count <= 3 && b.text == b.text.uppercased() {
            nameBlocks.append(b)
            break
        }
    }
}

if !nameBlocks.isEmpty {
    let combinedRaw = nameBlocks.map { $0.text }.joined(separator: " ")
    extractedFullName = cleanNameToken(combinedRaw)
}

let result: [String: Any] = [
    "success": true,
    "studentCode": extractedStudentCode as Any,
    "fullName": extractedFullName as Any,
    "schoolName": extractedSchool as Any,
    "graduationYear": extractedGradYear as Any,
    "rawLines": recognizedLines
]

if let jsonData = try? JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted]),
   let jsonString = String(data: jsonData, encoding: .utf8) {
    print(jsonString)
} else {
    print("{\"success\": false, \"error\": \"JSON serialization failed\"}")
}
