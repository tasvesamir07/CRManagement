const PDFDocument = require('pdfkit');
const db = require('../config/database');

function sortStudents(students) {
    return students.sort((a, b) => {
        const aIsNumeric = /^\d+$/.test(a.student_id);
        const bIsNumeric = /^\d+$/.test(b.student_id);
        if (aIsNumeric && !bIsNumeric) return -1;
        if (!aIsNumeric && bIsNumeric) return 1;
        return a.student_id.localeCompare(b.student_id, undefined, { numeric: true });
    });
}

async function getPresentStudents(courseId, date, examRoutineId) {
    const studentResult = await db.query(
        `SELECT s.* FROM students s
         JOIN student_courses sc ON s.id = sc.student_id
         WHERE sc.course_id = $1 AND s.is_active = true`,
        [courseId]
    );

    let attendanceQuery = 'SELECT * FROM attendance WHERE course_id = $1 AND date = $2 AND status = $3';
    const attendanceParams = [courseId, date, 'present'];

    if (examRoutineId) {
        attendanceQuery += ' AND exam_routine_id = $4';
        attendanceParams.push(examRoutineId);
    }

    const attendanceResult = await db.query(attendanceQuery, attendanceParams);
    const presentStudentIds = new Set(attendanceResult.rows.map(a => a.student_id));

    const presentStudents = studentResult.rows.filter(s => presentStudentIds.has(s.id));
    return sortStudents(presentStudents);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${day} ${month} ${year}`;
}

async function generateAttendancePdf(courseId, date, examRoutineId = null) {
    return new Promise(async (resolve, reject) => {
        try {
            const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
            if (courseResult.rows.length === 0) {
                throw new Error('Course not found');
            }
            const course = courseResult.rows[0];

            const presentStudents = await getPresentStudents(courseId, date, examRoutineId);

            const enrolledResult = await db.query(
                'SELECT COUNT(*) as count FROM student_courses WHERE course_id = $1',
                [courseId]
            );
            const totalEnrolled = parseInt(enrolledResult.rows[0].count);

            let section = '';
            if (examRoutineId) {
                const routineResult = await db.query('SELECT * FROM exam_routines WHERE id = $1', [examRoutineId]);
                if (routineResult.rows.length > 0) {
                    section = routineResult.rows[0].section || '';
                }
            }

            const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'portrait' });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            doc.fontSize(18).font('Helvetica-Bold')
               .text(`${course.course_id} - ${course.course_name}`, { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(14).font('Helvetica')
               .text('Attendance Sheet', { align: 'center' });
            doc.moveDown();

            const formattedDate = formatDate(date);
            let headerLine = `Date: ${formattedDate}`;
            if (section) {
                headerLine += `              Section: ${section}`;
            }
            doc.fontSize(11).font('Helvetica').text(headerLine);
            doc.moveDown(0.5);
            doc.moveTo(40, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);

            const colWidths = [40, 80, 200, 60, 80];
            const headers = ['SL', 'Student ID', 'Name', 'Section', 'Signature'];
            const tableTop = doc.y;

            doc.rect(40, tableTop, 505, 20).fill('#e0e0e0');
            doc.fill('#000000');
            doc.fontSize(10).font('Helvetica-Bold');
            let hx = 40;
            headers.forEach((header, i) => {
                doc.text(header, hx + 5, tableTop + 4, { width: colWidths[i], align: 'left' });
                hx += colWidths[i];
            });

            doc.y = tableTop + 20;
            doc.fontSize(9).font('Helvetica');
            presentStudents.forEach((student, index) => {
                const rowTop = doc.y;
                if (index % 2 === 0) {
                    doc.rect(40, rowTop, 505, 18).fill('#f9f9f9');
                    doc.fill('#000000');
                }

                let cx = 40;
                const rowData = [
                    String(index + 1),
                    student.student_id || '',
                    student.name || '',
                    student.section || '',
                    ''
                ];

                rowData.forEach((text, i) => {
                    doc.text(text, cx + 5, rowTop + 4, { width: colWidths[i], align: 'left' });
                    cx += colWidths[i];
                });

                doc.y = rowTop + 18;
            });

            doc.moveDown(1);
            doc.fontSize(11).font('Helvetica')
               .text(`Total Present: ${presentStudents.length}    Total Enrolled: ${totalEnrolled}`);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateAttendancePdf,
    formatDate,
    getPresentStudents
};
