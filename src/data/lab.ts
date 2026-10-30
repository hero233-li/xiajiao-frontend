/**
 * 实践演练题库：Java 上机（交大机考 A/B 卷）与数据库上机（2017-04 卷 12 题）。
 * 原文取自「自考交通大学实践」资料包，参考答案仅作对照。
 */

import { javaMockPapers } from './mockPapers';

export { sqlMockPapers } from './mockPapers';

export interface LabQuestion {
  id: string;
  no: number;
  title: string;
  score: string;
  requirement: string;
  checks: string[];
  starter?: string;
  answer: string;
  fileName: string;
  engine?: string;
  /** 在线执行方式：ddl=空库建表，query=示例数据上查询，mysql=MySQL 专属跑不了。 */
  mode?: 'ddl' | 'query' | 'mysql';
  /** 用的示例库：school=2017 真题那套（专业/班级/学生），library=模拟卷那套（图书/读者/借阅）。 */
  dataset?: 'school' | 'library';
}

export interface LabSet {
  id: string;
  name: string;
  note: string;
  /** 真题卷：题干照原卷，不展示额外评分点 */
  hideChecks?: boolean;
  /** 原卷前言里的库表说明（原样照抄，不算提示） */
  preface?: string[];
  questions: LabQuestion[];
}

const raw = String.raw;

/* ---------------------------- Java 上机 ---------------------------- */

const javaA1 = raw`import java.awt.*;
import javax.swing.*;
import java.util.*;

public class Test1 extends JFrame {

    JTextArea text;

    public Test1(String s) {
        super(s);
        Container contentPane = getContentPane();
        contentPane.setLayout(new BorderLayout());
        text = new JTextArea(10, 20);

        String str[] = new String[5];
        String s1 = "排序前：\n";
        for (int i = 0; i < str.length; i++) {
            str[i] = JOptionPane.showInputDialog("请输入字符串");
            s1 += str[i] + "\t";
        }
        text.setText(s1);

        Arrays.sort(str);
        String s2 = "\n排序后：\n";
        for (int i = 0; i < str.length; i++) {
            s2 += str[i] + "\t";
        }
        text.append(s2);

        contentPane.add(text, BorderLayout.CENTER);
        setSize(400, 160);
        setVisible(true);
    }

    public static void main(String[] args) {
        new Test1("第一题");
    }
}`;

const javaA2 = raw`import java.io.*;

public class Test2 {

    public static void main(String args[]) throws IOException {
        File file1 = new File("d:\\xxx\\yyy\\zzz");
        file1.mkdirs();
        File file2 = new File(file1, "1.txt");
        file2.createNewFile();

        String s = "I like java.";
        byte[] b = s.getBytes();
        FileOutputStream out = new FileOutputStream(file2);
        out.write(b);
        for (char ch = 'a'; ch <= 'z'; ch++) {
            out.write(ch);
        }
        out.close();

        FileInputStream readfile = new FileInputStream(file2);
        int b1;
        while ((b1 = readfile.read()) != -1) {
            System.out.print((char) b1);
        }
        readfile.close();
    }
}`;

const javaA3 = raw`import java.awt.*;
import java.awt.event.*;
import javax.swing.*;

public class Test3 extends JFrame {

    JTextArea text;
    JButton btn[] = new JButton[3];

    public Test3(String str) {
        super(str);
        Container contentPane = getContentPane();
        contentPane.setLayout(new BorderLayout());

        text = new JTextArea(20, 20);
        text.setFont(new Font("楷体_gb2312", Font.PLAIN, 30));
        contentPane.add(text, BorderLayout.CENTER);

        JPanel panel = new JPanel();
        for (int i = 0; i < btn.length; i++) {
            btn[i] = new JButton("按钮" + (i + 1));
            panel.add(btn[i]);
        }

        btn[0].addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                text.append("java程序设计\n");
            }
        });
        btn[1].addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                Color cr = JColorChooser.showDialog(null, "调色板", Color.red);
                text.setForeground(cr);
            }
        });
        btn[2].addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                Color cr = JColorChooser.showDialog(null, "调色板", Color.red);
                text.setBackground(cr);
            }
        });

        contentPane.add(panel, BorderLayout.NORTH);
        setSize(400, 300);
        setVisible(true);
    }

    public static void main(String args[]) {
        new Test3("第3题");
    }
}`;

const javaA4 = raw`// Test4.java
import java.awt.*;
import java.awt.event.*;
import javax.swing.*;
import java.awt.image.BufferedImage;
import java.io.*;
import javax.imageio.ImageIO;

public class Test4 extends JFrame {

    DrawPanel drawPanel;

    public Test4() {
        super("第4题");
        Container contentPane = getContentPane();
        contentPane.setLayout(new BorderLayout());

        drawPanel = new DrawPanel();
        contentPane.add(drawPanel, BorderLayout.CENTER);

        JMenuBar menuBar = new JMenuBar();
        setJMenuBar(menuBar);
        menuBar.add(buildMenu());

        setSize(400, 400);
        setVisible(true);
    }

    private JMenu buildMenu() {
        JMenu fileMenu = new JMenu("File");
        fileMenu.setMnemonic(KeyEvent.VK_F);

        JMenuItem fileNew = new JMenuItem("New");
        fileNew.setMnemonic(KeyEvent.VK_N);
        fileNew.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                drawPanel.state = DrawPanel.CLEAR;
                drawPanel.repaint();
            }
        });
        fileMenu.add(fileNew);

        JMenuItem fileSave = new JMenuItem("Save");
        fileSave.setMnemonic(KeyEvent.VK_S);
        fileSave.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                saveJPG(drawPanel.buffImage);
            }
        });
        fileMenu.add(fileSave);

        JMenuItem fileExit = new JMenuItem("Exit");
        fileExit.setMnemonic(KeyEvent.VK_X);
        fileExit.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                System.exit(0);
            }
        });
        fileMenu.add(fileExit);

        return fileMenu;
    }

    private void saveJPG(BufferedImage buffImage) {
        JFileChooser filechooser = new JFileChooser("./");
        int result = filechooser.showSaveDialog(this);
        if (result == JFileChooser.APPROVE_OPTION) {
            File file = filechooser.getSelectedFile();
            try {
                ImageIO.write(buffImage, "jpg", file);
            } catch (IOException ee) {
                ee.printStackTrace();
            }
        } else if (result == JFileChooser.CANCEL_OPTION) {
            JOptionPane.showMessageDialog(null, "图片没有保存", "提示信息", JOptionPane.PLAIN_MESSAGE);
        }
    }

    public static void main(String[] args) {
        new Test4();
    }
}

// DrawPanel.java
import java.awt.*;
import java.awt.event.*;
import javax.swing.*;
import java.awt.image.BufferedImage;
import java.util.ArrayList;

public class DrawPanel extends JPanel implements MouseMotionListener {

    int width = 400, height = 400;
    static final int DRAW = 1, CLEAR = 2;
    int state = 0;

    ArrayList array = new ArrayList();
    BufferedImage buffImage;
    Graphics2D gg;

    public DrawPanel() {
        setBackground(Color.white);
        buffImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        gg = buffImage.createGraphics();
        gg.setColor(Color.white);
        gg.fillRect(0, 0, width, height);
        addMouseMotionListener(this);
    }

    public void paint(Graphics g) {
        super.paint(g);
        gg.setColor(Color.red);
        Graphics2D g2d = (Graphics2D) g;
        if (state == DRAW) {
            gg.setStroke(new BasicStroke(3.0f));
            Point p1, p2;
            for (int i = 0; i < array.size() - 1; i++) {
                p1 = (Point) array.get(i);
                p2 = (Point) array.get(i + 1);
                gg.drawLine(p1.x, p1.y, p2.x, p2.y);
            }
        } else if (state == CLEAR) {
            gg.setColor(getBackground());
            gg.fillRect(0, 0, width, height);
        }
        g2d.drawImage(buffImage, 0, 0, width, height, this);
    }

    public Dimension getPreferredSize() {
        return new Dimension(width, height);
    }

    public void mouseMoved(MouseEvent e) {
        setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        array.clear();
    }

    public void mouseDragged(MouseEvent e) {
        state = DRAW;
        setCursor(Cursor.getPredefinedCursor(Cursor.CROSSHAIR_CURSOR));
        array.add(e.getPoint());
        repaint();
    }
}`;

const javaB1 = raw`import java.io.IOException;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class Test1 {
    public static void main(String args[]) throws IOException {
        BufferedReader buf;
        buf = new BufferedReader(new InputStreamReader(System.in));
        String str;
        long x;

        System.out.println("1.输入一个长整数，回车后求该数的二进制表示。");
        System.out.println("2.输入quit，回车后退出程序运行。");

        while (true) {
            System.out.print("Input:");
            str = buf.readLine();
            if (str.equals("quit"))
                break;
            x = Long.parseLong(str);
            printBinary(x);
        }
    }

    static void printBinary(long i) {
        System.out.print("\t" + i + "的2进制数表示为:\n");
        System.out.print("\t");
        for (int j = 63; j >= 0; j--)
            if (((1 << j) & i) != 0)
                System.out.print("1");
            else
                System.out.print("0");
        System.out.println();
    }
}`;

const javaB2 = raw`import java.io.*;

public class Test2 {

    public static void main(String args[]) throws IOException {
        FileReader fr = new FileReader("..//src//Test2.java");
        BufferedReader in = new BufferedReader(fr);

        FileWriter fw = new FileWriter("1.txt");
        BufferedWriter bw = new BufferedWriter(fw);

        String str;
        int i = 1;
        while ((str = in.readLine()) != null) {
            bw.write(i + ": " + str);
            bw.newLine();
            i++;
        }
        bw.flush();

        in.close();
        fr.close();
        bw.close();
        fw.close();
    }
}`;

const javaB3 = raw`import java.awt.*;
import java.awt.event.*;
import javax.swing.*;

public class Test3 extends JPanel implements MouseListener {

    int width = 300, height = 200;
    static int xPos, yPos;
    final static int MOUSE_CLICK = 1;
    int state;

    public Test3() {
        setBackground(Color.white);
        addMouseListener(this);
    }

    public void paint(Graphics g) {
        super.paint(g);
        if (state == MOUSE_CLICK) {
            g.setColor(Color.red);
            g.fillOval(xPos - 50, yPos - 50, 100, 100);
        }
    }

    public Dimension getPreferredSize() {
        return new Dimension(width, height);
    }

    public void mousePressed(MouseEvent e) {
    }
    public void mouseReleased(MouseEvent e) {
    }
    public void mouseClicked(MouseEvent e) {
        state = MOUSE_CLICK;
        xPos = e.getX();
        yPos = e.getY();
        repaint();
    }
    public void mouseEntered(MouseEvent e) {
    }
    public void mouseExited(MouseEvent e) {
    }

    public static void main(String[] args) {
        JFrame frame = new JFrame("第3题");
        Container contentPane = frame.getContentPane();
        Test3 panel = new Test3();
        contentPane.add(panel, BorderLayout.CENTER);
        frame.pack();
        frame.setVisible(true);
    }
}`;

const javaB4 = raw`import java.awt.*;
import java.awt.event.*;
import javax.swing.*;
import java.util.*;
import java.io.*;

public class Test4 extends JFrame {

    JTextArea text;

    public Test4(String str) {
        super(str);
        Container con = this.getContentPane();
        con.setLayout(new BorderLayout());

        text = new JTextArea(20, 20);
        text.setFont(new Font("楷体_gb2312", Font.BOLD, 20));
        con.add(new JScrollPane(text), BorderLayout.CENTER);

        JMenuBar menuBar = new JMenuBar();
        setJMenuBar(menuBar);
        menuBar.add(buildMenu());

        setSize(600, 400);
        setVisible(true);
    }

    public Integer[] myArray() {
        Random rd = new Random();
        Vector allNum = new Vector();
        Integer result[] = new Integer[7];
        int x;
        for (int i = 0; i < 36; i++) {
            allNum.add(new Integer(i + 1));
        }
        for (int i = 0; i < 7; i++) {
            x = rd.nextInt(36 - i);
            result[i] = (Integer) allNum.get(x);
            allNum.remove(x);
        }
        return result;
    }

    private JMenu buildMenu() {
        JMenu fileMenu = new JMenu("File");
        fileMenu.setMnemonic(KeyEvent.VK_F);

        JMenuItem fileNew = new JMenuItem("New");
        fileNew.setMnemonic(KeyEvent.VK_N);
        fileNew.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                text.setText("");
            }
        });
        fileMenu.add(fileNew);

        JMenuItem get7Num = new JMenuItem("Get7Num");
        get7Num.setMnemonic(KeyEvent.VK_G);
        get7Num.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                Integer[] myint = myArray();
                String s = "";
                for (int i = 0; i < myint.length; i++) {
                    s += myint[i].toString() + "\t";
                }
                text.append(s + System.getProperty("line.separator"));
            }
        });
        fileMenu.add(get7Num);

        JMenuItem fileSave = new JMenuItem("Save");
        fileSave.setMnemonic(KeyEvent.VK_S);
        fileSave.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                saveText();
            }
        });
        fileMenu.add(fileSave);

        JMenuItem fileExit = new JMenuItem("Exit");
        fileExit.setMnemonic(KeyEvent.VK_X);
        fileExit.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                System.exit(0);
            }
        });
        fileMenu.add(fileExit);

        return fileMenu;
    }

    private void saveText() {
        JFileChooser filechooser = new JFileChooser();
        int result = filechooser.showSaveDialog(this);
        if (result == JFileChooser.APPROVE_OPTION) {
            File file = filechooser.getSelectedFile();
            try {
                FileWriter fw = new FileWriter(file);
                BufferedWriter bufw = new BufferedWriter(fw);
                String s = text.getText();
                bufw.write(s, 0, s.length());
                bufw.flush();
                bufw.close();
            } catch (IOException ee) {
                ee.printStackTrace();
            }
        } else if (result == JFileChooser.CANCEL_OPTION) {
            JOptionPane.showMessageDialog(null, "没有保存文件");
        }
    }

    public static void main(String[] args) {
        new Test4("第4题");
    }
}`;

/* ---------------------- Java 题的起手模板 ---------------------- */
const javaStarterA1 = raw`import java.awt.*;
import java.util.Arrays;
import javax.swing.*;

public class Test1 extends JFrame {
    private final JTextArea text = new JTextArea(10, 20);

    public Test1(String title) {
        super(title);
        // TODO: 内容面板用 BorderLayout，把 text 放到 CENTER
        // TODO: 用 JOptionPane.showInputDialog 收 5 个字符串
        // TODO: Arrays.sort 升序，排序前后各输出一次到 text
        // TODO: setSize(400, 160); setVisible(true);
    }

    public static void main(String[] args) {
        new Test1("第一题");
    }
}`;

const javaStarterA2 = raw`import java.io.*;

public class Test2 {
    public static void main(String[] args) throws IOException {
        // TODO: new File("d:\\xxx\\yyy\\zzz").mkdirs()
        // TODO: createNewFile() 建 1.txt
        // TODO: "I like java.".getBytes() + FileOutputStream.write
        // TODO: 再写入 26 个大写字母
        // TODO: FileInputStream 读回，命令行显示
    }
}`;

const javaStarterA3 = raw`import java.awt.*;
import javax.swing.*;

public class Test3 extends JFrame {
    private final JTextArea text = new JTextArea(20, 20);
    private final JButton addButton = new JButton("java程序设计");
    private final JButton colorButton = new JButton("文字颜色");
    private final JButton backButton = new JButton("背景色");

    public Test3(String title) {
        super(title);
        // TODO: 北边放 3 个按钮（可先放进 JPanel），中间放 text
        // TODO: text.setFont(new Font("楷体_gb2312", Font.PLAIN, 30))
        // TODO: 三个按钮各自的监听：追加一行 / JColorChooser 改前景色 / 改背景色
        // TODO: setSize(400, 300); setVisible(true);
    }

    public static void main(String[] args) {
        new Test3("第3题");
    }
}`;

const javaStarterA4 = raw`import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;
import javax.swing.*;

class DrawPanel extends JPanel implements MouseMotionListener {
    // TODO: 白底、getPreferredSize 返回 400x400
    // TODO: 用 BufferedImage 存图，paint 里画出图像
    // TODO: 拖动鼠标时画 3.0f 的线
    public void mouseDragged(MouseEvent e) { }
    public void mouseMoved(MouseEvent e) { }
}

public class Test4 extends JFrame {
    private final DrawPanel panel = new DrawPanel();

    public Test4(String title) {
        super(title);
        // TODO: 菜单 File -> New / Save / Exit，带快捷键
        // TODO: New 清空画布；Save 用 JFileChooser 存 jpg（ImageIO.write）；Exit 退出
        // TODO: 中间放 panel，setSize(400, 400)
    }

    public static void main(String[] args) {
        new Test4("第4题");
    }
}`;

const javaStarterB1 = raw`import java.io.*;

public class Test1 {
    static void printBinary(long i) {
        // TODO: 把 i 的二进制表示输出在一行
    }

    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        // TODO: 循环读取一行，quit 退出，其它转成 long 交给 printBinary
    }
}`;

const javaStarterB2 = raw`import java.io.*;

public class Test2 {
    public static void main(String[] args) throws IOException {
        // TODO: FileReader + BufferedReader 逐行读源程序
        // TODO: FileWriter + BufferedWriter 写当前目录 1.txt，每行前加行号
    }
}`;

const javaStarterB3 = raw`import java.awt.*;
import java.awt.event.*;
import javax.swing.*;

public class Test3 extends JPanel implements MouseListener {
    public Test3() {
        // TODO: 白底
        // TODO: addMouseListener(this)
    }

    public void paintComponent(Graphics g) {
        super.paintComponent(g);
        // TODO: 画出所有已记录的圆
    }

    public void mousePressed(MouseEvent e) {
        // TODO: 只处理右键（SwingUtilities.isRightMouseButton），以点击处为圆心画半径 50 的红色填充圆
    }

    public void mouseClicked(MouseEvent e) { }
    public void mouseReleased(MouseEvent e) { }
    public void mouseEntered(MouseEvent e) { }
    public void mouseExited(MouseEvent e) { }

    public static void main(String[] args) {
        // TODO: JFrame 300x200，标题「第3题」，BorderLayout 中间放 this，pack()
    }
}`;

const javaStarterB4 = raw`import java.awt.*;
import java.awt.event.*;
import java.io.*;
import java.util.Random;
import javax.swing.*;

public class Test4 extends JFrame {
    private final JTextArea text = new JTextArea(20, 20);

    public Test4(String title) {
        super(title);
        // TODO: 中间放 new JScrollPane(text)
        // TODO: text.setFont(new Font("楷体_gb2312", Font.BOLD, 20))
        // TODO: 菜单 File -> New / Get7Num / Save / Exit，带快捷键
        // TODO: Get7Num 随机 7 个 1~36 不重复的整数，追加成一行
        // TODO: Save 用 JFileChooser 存文本
        // TODO: setSize(600, 400); setVisible(true);
    }

    public static void main(String[] args) {
        new Test4("第4题");
    }
}`;

/* --------------------- Java 模拟卷（按 13216 考纲） --------------------- */

const java18a1 = raw`class Student {
    private String sNo;
    private String sName;
    private String sex;
    private int sAge;
    private double sJava;

    public Student(String sNo, String sName, String sex, int sAge, double sJava) {
        this.sNo = sNo;
        this.sName = sName;
        this.sex = sex;
        this.sAge = sAge;
        this.sJava = sJava;
    }

    public String getsNo() {
        return sNo;
    }

    public String getsName() {
        return sName;
    }

    public String getSex() {
        return sex;
    }

    public int getsAge() {
        return sAge;
    }

    public double getsJava() {
        return sJava;
    }

    public static void main(String[] args) {
        Student[] all = {
            new Student("1001", "张三", "男", 20, 85.5),
            new Student("1002", "李四", "女", 21, 92.0),
            new Student("1003", "王五", "男", 19, 78.5),
            new Student("1004", "赵六", "女", 22, 66.0),
            new Student("1005", "钱七", "男", 20, 95.0)
        };

        double sum = 0;
        double max = all[0].getsJava();
        double min = all[0].getsJava();
        for (Student s : all) {
            System.out.println("学号：" + s.getsNo() + "，姓名：" + s.getsName()
                    + "，性别：" + s.getSex() + "，年龄：" + s.getsAge()
                    + "，Java 成绩：" + s.getsJava());
            sum += s.getsJava();
            if (s.getsJava() > max) {
                max = s.getsJava();
            }
            if (s.getsJava() < min) {
                min = s.getsJava();
            }
        }
        System.out.println("平均分：" + sum / all.length);
        System.out.println("最高分：" + max + "，最低分：" + min);
    }
}
`;

const java18a2 = raw`import java.util.Scanner;

class Prime {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("请输入一个数：");
        int n = sc.nextInt();
        System.out.println(isPrime(n));
        sc.close();
    }

    static boolean isPrime(int n) {
        if (n < 2) {
            return false;
        }
        for (int i = 2; i * i <= n; i++) {
            if (n % i == 0) {
                return false;
            }
        }
        return true;
    }
}
`;

const java18a3 = raw`import java.util.Scanner;

class Encrypt {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("请输入一个四位数：");
        int n = sc.nextInt();

        int[] d = { n / 1000, n / 100 % 10, n / 10 % 10, n % 10 };
        for (int i = 0; i < 4; i++) {
            d[i] = d[i] * 2 % 10;
        }

        swap(d, 0, 1);
        swap(d, 1, 3);

        System.out.println("加密后：" + d[0] + d[1] + d[2] + d[3]);
        sc.close();
    }

    static void swap(int[] d, int i, int j) {
        int t = d[i];
        d[i] = d[j];
        d[j] = t;
    }
}
`;

const java18b1 = raw`class Circle {
    protected double radius;

    public Circle() {
        this.radius = 10;
    }

    public Circle(double radius) {
        this.radius = radius;
    }

    public double Area() {
        return Math.PI * radius * radius;
    }

    public double circumference() {
        return 2 * Math.PI * radius;
    }

    public static void main(String[] args) {
        Circle c1 = new Circle();
        Circle c2 = new Circle(5);
        System.out.println("无参构造：radius=" + c1.radius + "，面积=" + c1.Area()
                + "，周长=" + c1.circumference());
        System.out.println("有参构造：radius=" + c2.radius + "，面积=" + c2.Area()
                + "，周长=" + c2.circumference());
    }
}
`;

const java18b2 = raw`class FactSum {
    public static void main(String[] args) {
        long sum = 0;
        long f = 1;
        for (int i = 1; i <= 10; i++) {
            f *= i;
            sum += f;
        }
        System.out.println("1!+2!+...+10! = " + sum);
    }
}
`;

const java18b3 = raw`class PrimeRange {
    public static void main(String[] args) {
        for (int n = 30; n <= 80; n++) {
            if (isPrime(n)) {
                System.out.print(n + " ");
            }
        }
        System.out.println();
    }

    static boolean isPrime(int n) {
        if (n < 2) {
            return false;
        }
        for (int i = 2; i * i <= n; i++) {
            if (n % i == 0) {
                return false;
            }
        }
        return true;
    }
}
`;

const java20a1 = raw`class Circle {
    protected double radius;

    public Circle() {
        this.radius = 20;
    }

    public Circle(double radius) {
        this.radius = radius;
    }

    public double Area() {
        return Math.PI * radius * radius;
    }

    public double perimeter() {
        return 2 * Math.PI * radius;
    }

    public static void main(String[] args) {
        Circle c1 = new Circle();
        Circle c2 = new Circle(8);
        System.out.println("无参构造：radius=" + c1.radius + "，面积=" + c1.Area()
                + "，周长=" + c1.perimeter());
        System.out.println("有参构造：radius=" + c2.radius + "，面积=" + c2.Area()
                + "，周长=" + c2.perimeter());
    }
}
`;

const java20a2 = raw`import java.util.Scanner;

class PrimeCheck {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("请输入一个数：");
        int n = sc.nextInt();
        System.out.println(check(n));
        sc.close();
    }

    static boolean check(int n) {
        if (n < 2) {
            return false;
        }
        for (int i = 2; i * i <= n; i++) {
            if (n % i == 0) {
                return false;
            }
        }
        return true;
    }
}
`;

const java20a3 = raw`class UpperCount {
    public static void main(String[] args) {
        String str = "I Love Shanghai";
        char[] arr = str.toCharArray();
        int count = 0;
        for (int i = 0; i < arr.length; i++) {
            int code = (int) arr[i];
            if (code >= (int) 'A' && code <= (int) 'Z') {
                count++;
            }
        }
        System.out.println("大写字母个数：" + count);
    }
}
`;

const java20b1 = raw`class Cylinder {
    private double radius;
    private double height;

    public Cylinder(double radius, double height) {
        this.radius = radius;
        this.height = height;
    }

    public double volume() {
        return Math.PI * radius * radius * height;
    }

    public double surfaceArea() {
        return 2 * Math.PI * radius * radius + 2 * Math.PI * radius * height;
    }

    public static void main(String[] args) {
        Cylinder c = new Cylinder(3, 5);
        System.out.println("半径 3、高 5 的圆柱体：");
        System.out.println("体积 = " + c.volume());
        System.out.println("表面积 = " + c.surfaceArea());
    }
}
`;

const java20b2 = raw`class Prime100To1000 {
    public static void main(String[] args) {
        int count = 0;
        for (int n = 100; n <= 1000; n++) {
            if (isPrime(n)) {
                System.out.print(n + " ");
                count++;
                if (count % 10 == 0) {
                    System.out.println();
                }
            }
        }
        System.out.println();
        System.out.println("共 " + count + " 个素数");
    }

    static boolean isPrime(int n) {
        for (int i = 2; i * i <= n; i++) {
            if (n % i == 0) {
                return false;
            }
        }
        return true;
    }
}
`;

const java20b3 = raw`class FactSum {
    public static void main(String[] args) {
        long sum = 0;
        long f = 1;
        for (int i = 1; i <= 10; i++) {
            f *= i;
            sum += f;
        }
        System.out.println("1!+2!+...+10! = " + sum);
    }
}
`;

const javaSet18A: LabSet = {
  id: 'java-2018-a',
  name: '真题 2018A',
  hideChecks: true,
  note: '《Java 语言程序设计》上机考试 A 卷（2018）。三道题分别存为 1.java、2.java、3.java 上传。',
  questions: [
    {
      id: 'java-18a-1',
      no: 1,
      title: 'Student 类与成绩统计',
      score: '',
      fileName: '1.java',
      starter: '',
      requirement:
        '定义一个描述学生信息的类 Student：(1) 成员变量 sNo 学号、sName 姓名、sex 性别、sAge 年龄、sJava 表示 Java 课程成绩；(2) 带参数的构造方法，在构造方法中通过形参完成对成员变量的赋值；(3) 方法成员 getsNo() 获得学号、getsName() 获得姓名、getSex 获得性别、getsAge 获得年龄、getsJava() 获得 Java 课程成绩；(4) 创建 Student 类的 5 个对象，输出每个学生的信息，计算并输出这五个学生 Java 课程成绩的平均值，同时计算并输出最高分和最低分。',
      checks: [
        '五个成员变量齐全，类型合理（学号/姓名/性别用 String，年龄 int，成绩 double）',
        '带参数构造方法用 this 完成赋值',
        '五个 get 方法齐全',
        '创建 5 个对象并逐个输出信息',
        '遍历求平均值、最高分、最低分三个结果都输出',
      ],
      answer: java18a1,
    },
    {
      id: 'java-18a-2',
      no: 2,
      title: '判断素数（键盘输入）',
      score: '',
      fileName: '2.java',
      starter: '',
      requirement: '从键盘输入一个数，判断这个数是否是素数，输出 true 或者 false。例如输入「19」，输出 true。',
      checks: [
        '从键盘读入一个整数（Scanner 或 BufferedReader）',
        '判断逻辑正确：小于 2 直接 false，试除到平方根即可',
        '输出 true / false，不能输出「是素数」之类的文字',
        '19 输出 true，20 输出 false',
      ],
      answer: java18a2,
    },
    {
      id: 'java-18a-3',
      no: 3,
      title: '四位数加密',
      score: '',
      fileName: '3.java',
      starter: '',
      requirement:
        '网络传输四位加密数据，加密规则：每位数字都乘以 2，然后用乘积除以 10 的余数代替该数字，再将第 1 位和第 2 位交换，第 2 位和第 4 位交换。',
      checks: [
        '拆出四位：n/1000、n/100%10、n/10%10、n%10',
        '每位 * 2 % 10 替换',
        '先交换第 1、2 位，再交换第 2、4 位（顺序不能反）',
        '结果仍按四位输出（含前导 0 的情况）',
      ],
      answer: java18a3,
    },
  ],
};

const javaSet18B: LabSet = {
  id: 'java-2018-b',
  name: '真题 2018B',
  hideChecks: true,
  note: '《Java 语言程序设计》上机考试 B 卷（2018）。第一题存为 1.java。',
  questions: [
    {
      id: 'java-18b-1',
      no: 1,
      title: 'Circle 类：面积与周长',
      score: '',
      fileName: '1.java',
      starter: '',
      requirement:
        '写一个圆形 Circle 类，含有一个 protected 变量 radius，两个构造函数：其中一个无参数的构造函数初始化 radius 为 10，第二个为有参数的构造函数，使用传入的参数初始化 radius。(1) 编写该类的 Area() 方法，用于计算圆的面积；(2) 编写该类的 circumference() 方法，用于计算圆的周长。',
      checks: [
        'radius 声明为 protected',
        '无参构造把 radius 初始化为 10',
        '有参构造用形参赋值',
        'Area() 返回 Math.PI * radius * radius',
        'circumference() 返回 2 * Math.PI * radius',
      ],
      answer: java18b1,
    },
    {
      id: 'java-18b-2',
      no: 2,
      title: '求 1!+2!+…+10!',
      score: '',
      fileName: '2.java',
      starter: '',
      requirement: '求阶乘的和 1!+2!+3!+…+10! 相加之和。',
      checks: [
        '外层循环 1..10，内层累乘求阶乘（或复用上一项 f *= i）',
        '累加得到结果 4037913',
        '用 long 存，避免 int 溢出（10! 已超 int 上限）',
      ],
      answer: java18b2,
    },
    {
      id: 'java-18b-3',
      no: 3,
      title: '30~80 之间的素数',
      score: '',
      fileName: '3.java',
      starter: '',
      requirement: '求 30-80 范围内所有的素数。',
      checks: [
        '循环区间 30..80',
        '素数判断：从 2 试除到平方根',
        '结果为 31、37、41、43、47、53、59、61、67、71、73、79',
      ],
      answer: java18b3,
    },
  ],
};

const javaSet20A: LabSet = {
  id: 'java-2020-a',
  name: '真题 2020A',
  hideChecks: true,
  note: '《Java 语言程序设计》上机考试 A 卷（2020）。第一、二题与 2018 年同型，无参构造初始化为 20。',
  questions: [
    {
      id: 'java-20a-1',
      no: 1,
      title: 'Circle 类：面积与周长（radius=20）',
      score: '',
      fileName: '1.java',
      starter: '',
      requirement:
        'Circle 类，含有 protected 变量 radius，两个构造函数：其中一个无参数的构造函数初始化 radius 为 20，第二个为有参的构造函数，使用传入的参数初始化 radius；编写该类的 Area 计算面积，编写该类的 perimeter 计算周长。',
      checks: [
        'radius 声明为 protected',
        '无参构造把 radius 初始化为 20',
        '有参构造用形参赋值',
        'Area 计算面积：Math.PI * radius * radius',
        'perimeter 计算周长：2 * Math.PI * radius',
      ],
      answer: java20a1,
    },
    {
      id: 'java-20a-2',
      no: 2,
      title: '判断素数，返回 true/false',
      score: '',
      fileName: '2.java',
      starter: '',
      requirement:
        '输入一个数，判断是否是素数，是素数返回 true，不是返回 false，如输入「19」，输出 true。',
      checks: [
        '键盘读入整数',
        '单独的方法返回 boolean（不是直接打印结论）',
        '小于 2 返回 false，试除到平方根',
        '19 输出 true，1 和 20 输出 false',
      ],
      answer: java20a2,
    },
    {
      id: 'java-20a-3',
      no: 3,
      title: '统计字符串里大写字母个数',
      score: '',
      fileName: '3.java',
      starter: '',
      requirement:
        '统计字符串里大写字母的个数，如「I Love Shanghai」的大写字母个数为 3。（解题思路：str.toCharArray()，然后把 (int) str[i] 和 A、Z 的 ASCII 码对比。）',
      checks: [
        '用 toCharArray() 或 charAt 逐字符遍历',
        '判断区间 65..90（即 A..Z），或直接 c >= \'A\' && c <= \'Z\'',
        '只数大写字母，空格与小写不计',
        '示例「I Love Shanghai」结果为 3',
      ],
      answer: java20a3,
    },
  ],
};

const javaSet20B: LabSet = {
  id: 'java-2020-b',
  name: '真题 2020B',
  hideChecks: true,
  note: '《Java 语言程序设计》上机考试 B 卷（2020）。三道题分别存为 1.java、2.java、3.java。',
  questions: [
    {
      id: 'java-20b-1',
      no: 1,
      title: '圆柱体的体积和表面积',
      score: '',
      fileName: '1.java',
      starter: '',
      requirement: '编写程序求圆柱体的体积和表面积（半径 r、高 h 自行给定或从键盘输入）。',
      checks: [
        '圆柱体要有 radius 与 height 两个属性',
        '体积 = πr²h',
        '表面积 = 2πr² + 2πrh（两个底面积 + 侧面积）',
        '结果用 System.out.println 输出，数值合理',
      ],
      answer: java20b1,
    },
    {
      id: 'java-20b-2',
      no: 2,
      title: '100~1000 的素数',
      score: '',
      fileName: '2.java',
      starter: '',
      requirement: '求 100 到 1000 之间所有的素数。',
      checks: [
        '循环区间 100..1000',
        '素数判断从 2 试除到平方根，1 不是素数',
        '共 143 个素数',
        '输出格式整齐即可（可每行 10 个）',
      ],
      answer: java20b2,
    },
    {
      id: 'java-20b-3',
      no: 3,
      title: '求 1!+2!+…+10!',
      score: '',
      fileName: '3.java',
      starter: '',
      requirement: '求阶乘的和 1!+2!+3!+…+10! 相加之和。',
      checks: [
        '复用上一项阶乘：f *= i 再累加，避免双重循环重复计算',
        '结果为 4037913',
        '用 long 存，int 会溢出',
      ],
      answer: java20b3,
    },
  ],
};

export const javaSets: LabSet[] = [
  ...javaMockPapers,
  {
    id: 'java-a',
    name: '真题 2007A',
    note: '180 分钟，4 题各 25 分。窗口与 IO 是主考点。',
    questions: [
      {
        id: 'java-a-1',
        no: 1,
        title: 'JFrame 窗口 + 字符串数组排序',
        score: '25 分',
        fileName: 'Test1.java',
      starter: javaStarterA1,
        requirement:
          '编写图形界面程序：类继承 JFrame，窗口 400×160，标题「第一题」，内容面板 BorderLayout，中间放 10 行 20 列的 JTextArea。定义 5 个元素的字符串数组，用 JOptionPane.showInputDialog 逐个赋值，用 Arrays.sort 升序排序，把排序前和排序后的结果显示在文本区。',
        checks: [
          '类继承 JFrame，标题「第一题」，setSize(400, 160)',
          '内容面板用 BorderLayout，JTextArea(10, 20) 放在 CENTER',
          'String[5] 循环 5 次 showInputDialog 赋值',
          'Arrays.sort(str) 升序',
          '文本区先 setText 排序前、再 append 排序后',
        ],
        answer: javaA1,
      },
      {
        id: 'java-a-2',
        no: 2,
        title: 'File + 字节流写读文件',
        score: '25 分',
        fileName: 'Test2.java',
      starter: javaStarterA2,
        requirement:
          '命令行程序：用 File 的 mkdirs() 创建目录树 d:\\xxx\\yyy\\zzz，用 createNewFile() 建 1.txt；用 getBytes() 把「I like java.」转成字节数组，用 FileOutputStream.write(byte[]) 写入；再把 26 个大写字母写入该文件；最后用 FileInputStream 读回并在命令行显示。',
        checks: [
          'new File("d:\\\\xxx\\\\yyy\\\\zzz").mkdirs()',
          'createNewFile() 建 1.txt',
          'getBytes() + FileOutputStream.write 写入 "I like java."',
          '循环写入 26 个字母（题目写大写 A-Z）',
          'FileInputStream 逐字节读回，print((char) b)',
          '所有流 close()，main 声明 throws IOException',
        ],
        answer: javaA2,
      },
      {
        id: 'java-a-3',
        no: 3,
        title: '三个按钮 + 文本区字体颜色背景',
        score: '25 分',
        fileName: 'Test3.java',
      starter: javaStarterA3,
        requirement:
          'JFrame 400×300，标题「第3题」，BorderLayout：北边放 3 个按钮，中间放 20 行 20 列 JTextArea，字体「楷体_gb2312」普通体 30 号。按钮1 追加一行「java程序设计」；按钮2 弹颜色选择对话框设文字颜色；按钮3 弹颜色选择对话框设文本区背景色。',
        checks: [
          'setTitle 通过构造 super(str)，标题「第3题」，setSize(400, 300)',
          '北边 JPanel 里 3 个按钮（JPanel 默认 FlowLayout）',
          'text.setFont(new Font("楷体_gb2312", Font.PLAIN, 30))',
          '按钮1 text.append("java程序设计\\n")',
          '按钮2 JColorChooser.showDialog + setForeground',
          '按钮3 同法 + setBackground',
        ],
        answer: javaA3,
      },
      {
        id: 'java-a-4',
        no: 4,
        title: '绘图面板 + 菜单保存 JPG',
        score: '25 分',
        fileName: 'Test4.java',
      starter: javaStarterA4,
        requirement:
          '两个类：DrawPanel 继承 JPanel，白底 400×400，实现鼠标移动监听，拖动时十字光标并在 paint 里沿路径画 3.0f 的线，图形先画在 BufferedImage 再显示；Test4 继承 JFrame，400×400，标题「第4题」，菜单 File 下 New/Save/Exit 带快捷键，New 清空画布，Save 用 JFileChooser 存 jpg，Exit 退出。',
        checks: [
          'DrawPanel 白底、getPreferredSize 返回 400×400',
          'implements MouseMotionListener，mouseDragged 里 CROSSHAIR_CURSOR',
          'paint 里 BasicStroke(3.0f) 按点连线，最后还是 drawImage(buffImage)',
          'Test4 标题「第4题」，BorderLayout 中间放 DrawPanel',
          'JMenuBar + JMenu("File") + 三个 JMenuItem，均 setMnemonic',
          'New 置 CLEAR 并 repaint；Save 写 jpg；Exit System.exit(0)',
        ],
        answer: javaA4,
      },
    ],
  },
  {
    id: 'java-b',
    name: '真题 2007B',
    note: '同一套考点，题面换成命令行 + 鼠标事件 + 菜单。',
    questions: [
      {
        id: 'java-b-1',
        no: 1,
        title: '命令行输入 + 自定义二进制方法',
        score: '25 分',
        fileName: 'Test1.java',
      starter: javaStarterB1,
        requirement:
          '命令行程序：读取输入的长整数并求二进制表示，输入 quit 退出。求二进制并在一行输出必须由自定义方法 static void printBinary(long i) 完成。',
        checks: [
          'BufferedReader(new InputStreamReader(System.in)) 读行',
          'while(true) 循环，输入 quit 时 break',
          'Long.parseLong 转换，main 声明 throws IOException',
          '自定义 static void printBinary(long i)',
          '按位从高位到低位输出（答案用 63..0 位）',
        ],
        answer: javaB1,
      },
      {
        id: 'java-b-2',
        no: 2,
        title: '字符流读写 + 加行号',
        score: '25 分',
        fileName: 'Test2.java',
      starter: javaStarterB2,
        requirement:
          '命令行程序：用 FileReader 链接 BufferedReader 读取源程序每一行；用 FileWriter 链接 BufferedWriter 把每一行加行号后写入当前目录 1.txt。',
        checks: [
          'FileReader + BufferedReader 读源文件',
          'FileWriter + BufferedWriter 写 1.txt',
          'readLine() 循环到 null，每行写「序号: 内容」',
          'bw.newLine() 换行，flush()',
          '四个流都 close()',
        ],
        answer: javaB2,
      },
      {
        id: 'java-b-3',
        no: 3,
        title: '面板子类 + 右键画圆',
        score: '25 分',
        fileName: 'Test3.java',
      starter: javaStarterB3,
        requirement:
          '继承 JPanel，白底，实现 MouseListener：点击鼠标右键，在以点击处为中心画半径 50 像素的红色填充圆，其余鼠标事件不处理。面板子类自带 main：创建 JFrame 300×200，标题「第3题」，BorderLayout 中间放该面板并 pack()。',
        checks: [
          'extends JPanel implements MouseListener，白底',
          'mouseClicked 里取 e.getX()/getY() 存坐标并 repaint',
          'paint 里 fillOval(x-50, y-50, 100, 100)，setColor(Color.red)',
          'getPreferredSize 返回 300×200',
          'main 里 JFrame("第3题") + BorderLayout.CENTER + pack() + setVisible',
          'MouseListener 五个方法全部实现（空方法也要写）',
        ],
        answer: javaB3,
      },
      {
        id: 'java-b-4',
        no: 4,
        title: '带滚动条文本区 + 36 选 7',
        score: '25 分',
        fileName: 'Test4.java',
      starter: javaStarterB4,
        requirement:
          'JFrame 600×400，标题「第4题」，BorderLayout 中间放 20 行 20 列带滚动条的 JTextArea，字体「楷体_gb2312」粗体 20。菜单 File 下 4 项 New/Get7Num/Save/Exit 带快捷键：New 清空；Get7Num 随机生成 7 个 1~36 不重复整数并追加到文本区一行；Save 用 JFileChooser 按显示格式存文本；Exit 退出。',
        checks: [
          'new JScrollPane(text) 放在 CENTER',
          'text.setFont(new Font("楷体_gb2312", Font.BOLD, 20))',
          'JMenuBar + File 菜单 + 4 个菜单项，都设 setMnemonic',
          'Get7Num 用 Vector 或循环去重取 7 个数（1~36）',
          'Save 用 FileWriter + BufferedWriter 写 text.getText()',
          'Exit System.exit(0)',
        ],
        answer: javaB4,
      },
    ],
  },
  javaSet18A,
  javaSet18B,
  javaSet20A,
  javaSet20B,
];

/* --------------------------- 数据库上机 --------------------------- */

const sqlQ1 = raw`drop database if exists school;
create database school;
use school;

create table majorinfo (
  majorid int primary key,
  major   varchar(20)
);

create table classinfo (
  classid     char(5) primary key,
  classnumber int,
  majorid     int,
  foreign key (majorid) references majorinfo(majorid)
);

create table studentinfo (
  studentid     int primary key comment '学生编号',
  studentname   varchar(20) unique,
  studentsex    char(1),
  studentage    smallint check (studentage > 18),
  studentmark   smallint,
  entrancedate  datetime,
  classid       char(5) not null,
  foreign key (classid) references classinfo(classid)
);`;

const sqlQ2 = raw`select *
from studentinfo
where entrancedate > '2001-01-01'
  and studentname like '张%';`;

const sqlQ3 = raw`select s.studentname, s.studentage, s.classid, m.major
from studentinfo s
join classinfo c on s.classid = c.classid
join majorinfo m on c.majorid = m.majorid
where m.major = '信息管理与信息系统'
  and s.studentsex = '男'
order by s.studentage asc;`;

const sqlQ4 = raw`select studentname, studentage, studentmark
from studentinfo s
where s.classid = 'G0208'
  and s.studentmark < (
    select avg(studentmark)
    from studentinfo s1
    where s1.classid = 'G0208'
  );`;

const sqlQ5 = raw`select classid, count(studentid) as num
from studentinfo
where studentmark > 90
group by classid
having count(studentid) > 10;`;

const sqlQ6 = raw`update classinfo c
set classnumber = (
  select count(1) from studentinfo s where s.classid = c.classid
);`;

const sqlQ7 = raw`update studentinfo s
set studentmark = studentmark * 1.02
where studentage > 30
  and classid in (
    select c.classid
    from classinfo c
    join majorinfo m on c.majorid = m.majorid
    where m.major = '信息管理与信息系统'
  );`;

const sqlQ8 = raw`-- 写法一：两个子查询连接
select a.studentsex as '性别', a.pass as '及格', b.nopass as '不及格'
from (
  select studentsex, count(studentid) pass
  from studentinfo where studentmark >= 60 group by studentsex
) a
join (
  select studentsex, count(studentid) nopass
  from studentinfo where studentmark < 60 group by studentsex
) b on a.studentsex = b.studentsex;

-- 写法二：case when 行转列（更稳，不会因为一边为空而丢行）
select studentsex as '性别',
       sum(case when studentmark >= 60 then 1 else 0 end) as '及格',
       sum(case when studentmark < 60 then 1 else 0 end) as '不及格'
from studentinfo
group by studentsex;`;

const sqlQ9 = raw`drop trigger if exists tr_studentinfo_mark_update;
delimiter $$
create trigger tr_studentinfo_mark_update
before update on studentinfo
for each row
begin
  if old.studentmark > 90 then
    signal sqlstate 'HY000' set message_text = '大于90分的学生不允许修改成绩.';
  end if;
end$$
delimiter ;`;

const sqlQ10 = raw`drop trigger if exists tr_studentinfo_delete;
delimiter $$
create trigger tr_studentinfo_delete
before delete on studentinfo
for each row
begin
  if old.studentage < 30 then
    signal sqlstate 'HY000' set message_text = '年龄小于30岁的学生不允许删除.';
  end if;
end$$
delimiter ;`;

const sqlQ11 = raw`drop procedure if exists p_studentinfo_get;
delimiter $$
create procedure p_studentinfo_get(in beginTime datetime, in endTime datetime)
begin
  select * from studentinfo
  where entrancedate between beginTime and endTime
  order by entrancedate;
end$$
delimiter ;

-- 调用
call p_studentinfo_get('2000-01-01', '2002-12-31');`;

const sqlQ12 = raw`drop function if exists f_info_concat;
delimiter $$
create function f_info_concat(vclassid char(5))
returns varchar(4096)
reads sql data
begin
  declare v_result varchar(4096);
  select group_concat(studentname, '(', studentage, ')')
  into v_result
  from studentinfo
  where classid = vclassid
  group by classid
  order by studentage;
  return v_result;
end$$
delimiter ;

-- 调用
select f_info_concat('G0208');`;

/** 查询题的起手模板：示例库是现成的，只提示从哪写起。 */
export const sqlSet: LabSet = {
  id: 'sql-201704',
  name: '真题 2017-04',
  hideChecks: true,
  note: '打开 SQL Server，建立名为 School 的数据库，在其中建 StudentInfo、ClassInfo、MajorInfo 三张表。语句写在 1.sql 里，考试结束上传，可以重复提交覆盖。',
  preface: [
    'StudentInfo：学生编号 StudentId int 主键；学生姓名 StudentName varchar(20) 唯一；学生性别 StudentSex nchar(1)，在「男」「女」中取值；学生年龄 StudentAge smallint，大于 18 岁；学生成绩 StudentMark smallint；入学时间 EntranceDate smalldatetime；班级编号 ClassId char(5) 外键。备注：假设一个学生只有一个成绩。',
    'ClassInfo：班级编号 ClassId char(5)；班级人数 ClassNumber int，允许空；专业编号 MajorId int。',
    'MajorInfo：专业编号 MajorId int；专业名称 Major varchar(20)。',
  ],
  questions: [
    {
      id: 'sql-1',
      mode: 'ddl',
      no: 1,
      title: '创建 StudentInfo 表',
      score: '',
      fileName: '01-ddl.sql',
      engine: 'MySQL',
      requirement:
        '写出创建 StudentInfo 表的 SQL 语句。（要求写出约束相关语句）StudentInfo 字段：学生编号 StudentId int 为主键；学生姓名 StudentName varchar(20) 唯一；学生性别 StudentSex nchar(1)，在「男」「女」中取值；学生年龄 StudentAge smallint，要求输入年龄大于 18 岁；学生成绩 StudentMark smallint；入学时间 EntranceDate smalldatetime；班级编号 ClassId char(5)，外键。假设一个学生只有一个成绩。',
      checks: [
        '建出 studentinfo 表，字段齐全',
        '主键 studentid',
        'studentname 唯一',
        'studentsex 限制取值男或女',
        'studentage 限制大于 18',
        'classid 是外键',
      ],
      answer: sqlQ1,
      starter: '',
    },
    {
      id: 'sql-2',
      mode: 'query',
      no: 2,
      title: '按姓名与入学时间查询',
      score: '',
      fileName: '02-select.sql',
      engine: 'MySQL',
      requirement: '查询学生姓名中第一个字为「张」且入学时间晚于 2001 年 1 月 1 日的所有学生信息。',
      checks: ['姓名以张开头', '入学时间晚于 2001-01-01', '两个条件同时满足'],
      answer: sqlQ2,
      starter: '',
    },
    {
      id: 'sql-3',
      mode: 'query',
      no: 3,
      title: '多表连接查询',
      score: '',
      fileName: '03-join.sql',
      engine: 'MySQL',
      requirement:
        '查询专业名称（Major）为信息管理与信息系统的所有男学生姓名、年龄及成绩、班级编号及专业名称，输出按照年龄从小到大排列。',
      checks: [
        '用到 studentinfo、classinfo、majorinfo',
        '筛选专业名称与性别为男',
        '输出姓名、年龄、成绩、班级编号、专业名称',
        '按年龄升序排列',
      ],
      answer: sqlQ3,
      starter: '',
    },
    {
      id: 'sql-4',
      mode: 'query',
      no: 4,
      title: '低于班级平均分',
      score: '',
      fileName: '04-subquery.sql',
      engine: 'MySQL',
      requirement: "查询班级编号（ClassId）为 'G0208' 的小于该班级平均分的学生姓名、年龄和成绩信息。",
      checks: ['限定班级 G0208', '与该班平均分比较', '输出姓名、年龄、成绩'],
      answer: sqlQ4,
      starter: '',
    },
    {
      id: 'sql-5',
      mode: 'query',
      no: 5,
      title: '成绩优秀的班级',
      score: '',
      fileName: '05-group.sql',
      engine: 'MySQL',
      requirement: '查询有多于 10 个学生考试成绩优秀（大于 90）的班级编号。',
      checks: ['按班级分组统计', '成绩大于 90 才计入', '人数多于 10'],
      answer: sqlQ5,
      starter: '',
    },
    {
      id: 'sql-6',
      mode: 'query',
      no: 6,
      title: '更新班级人数',
      score: '',
      fileName: '06-update.sql',
      engine: 'MySQL',
      requirement: '对每个班级，求该班学生的人数，并将结果存入到班级信息表中的班级人数字段中。（使用 Update 语句）',
      checks: ['统计每个班级的学生人数', '用 update 写回 classinfo 的班级人数字段'],
      answer: sqlQ6,
      starter: '',
    },
    {
      id: 'sql-7',
      mode: 'query',
      no: 7,
      title: '成绩增加 2%',
      score: '',
      fileName: '07-update-in.sql',
      engine: 'MySQL',
      requirement: '将所有专业名称为「信息管理与信息系统」的年龄大于 30 的学生考试成绩加上 2%。',
      checks: ['限定专业名称', '限定年龄大于 30', '成绩按 2% 增加'],
      answer: sqlQ7,
      starter: '',
    },
    {
      id: 'sql-8',
      mode: 'query',
      no: 8,
      title: '行转列统计',
      score: '',
      fileName: '08-pivot.sql',
      engine: 'MySQL',
      requirement:
        '写出查询如下结果的 SQL 语句。结果表三列：性别、及格、不及格；两行：男、女；格子里是人数。',
      checks: ['按性别分组', '分别统计及格人数与不及格人数', '结果一行一个性别'],
      answer: sqlQ8,
      starter: '',
    },
    {
      id: 'sql-9',
      mode: 'mysql',
      no: 9,
      title: '触发器：改成绩',
      score: '',
      fileName: '09-trigger-update.sql',
      engine: 'MySQL',
      requirement: '编写触发器，分数大于 90 分的学生不允许修改其成绩。',
      checks: ['触发器挂在 update 上', '判断原分数大于 90', '拒绝并给出提示'],
      answer: sqlQ9,
      starter: '',
    },
    {
      id: 'sql-10',
      mode: 'mysql',
      no: 10,
      title: '触发器：删学生',
      score: '',
      fileName: '10-trigger-delete.sql',
      engine: 'MySQL',
      requirement: '编写触发器，年龄小于 30 岁的学生不允许被删除。',
      checks: ['触发器挂在 delete 上', '判断年龄小于 30', '拒绝并给出提示'],
      answer: sqlQ10,
      starter: '',
    },
    {
      id: 'sql-11',
      mode: 'mysql',
      no: 11,
      title: '存储过程：入学时间区间',
      score: '',
      fileName: '11-procedure.sql',
      engine: 'MySQL',
      requirement: '编写存储过程，传入入学时间的下限与上限，返回符合要求的所有学生信息。',
      checks: ['两个入参分别是下限与上限', '按入学时间过滤', '返回学生信息'],
      answer: sqlQ11,
      starter: '',
    },
    {
      id: 'sql-12',
      mode: 'mysql',
      no: 12,
      title: '自定义函数：拼接姓名年龄',
      score: '',
      fileName: '12-function.sql',
      engine: 'MySQL',
      requirement:
        '编写自定义函数，传入班级编号，返回该班级所有学生姓名及年龄的拼接字符串，中间使用逗号分割。（如返回：张三(20), 李四(21), 王五(20)）',
      checks: ['入参是班级编号', '拼接格式为 姓名(年龄)', '多项之间用逗号分隔'],
      answer: sqlQ12,
      starter: '',
    },
  ],
};

/* --------------------- 数据库模拟卷（按 04736 考纲） --------------------- */
