/**
 * 实践演练题库：Java 上机（交大机考 A/B 卷）与数据库上机（2017-04 卷 12 题）。
 * 原文取自「自考交通大学实践」资料包，参考答案仅作对照。
 */

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

const javaMock1 = raw`import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

/** 字符统计：统计一行字符里的数字、英文字母、其它字符各多少个。 */
public class CharCount {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        System.out.println("请输入一行字符：");
        String line = in.readLine();
        if (line == null) {
            line = "abc123!@#XYZ456";   // 没接键盘（如远程运行）时用示例行
        }

        int digits = 0, letters = 0, others = 0;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c >= '0' && c <= '9') {
                digits++;
            } else if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
                letters++;
            } else {
                others++;
            }
        }
        System.out.println("数字 " + digits + " 个，字母 " + letters + " 个，其它 " + others + " 个");
    }
}`;

const javaMock2 = raw`/** 水仙花数：三位数，各位数字的立方和等于它本身。 */
public class Narcissus {
    public static void main(String[] args) {
        for (int n = 100; n <= 999; n++) {
            int a = n / 100;
            int b = n / 10 % 10;
            int c = n % 10;
            if (a * a * a + b * b * b + c * c * c == n) {
                System.out.print(n + " ");
            }
        }
        System.out.println();
    }
}`;

const javaMock3 = raw`/** 完数：等于其所有真因子之和（6 = 1 + 2 + 3）。 */
public class PerfectNumber {
    public static void main(String[] args) {
        for (int n = 2; n <= 1000; n++) {
            int sum = 0;
            StringBuilder factors = new StringBuilder();
            for (int i = 1; i < n; i++) {
                if (n % i == 0) {
                    sum += i;
                    factors.append(factors.length() == 0 ? "" : "+").append(i);
                }
            }
            if (sum == n) {
                System.out.println(n + " = " + factors);
            }
        }
    }
}`;

const javaMock4 = raw`/** 素数：输出 1 到 100 之间的素数，每行 10 个。 */
public class PrimeList {
    public static void main(String[] args) {
        int count = 0;
        for (int n = 2; n <= 100; n++) {
            boolean prime = true;
            for (int i = 2; i * i <= n; i++) {
                if (n % i == 0) {
                    prime = false;
                    break;
                }
            }
            if (prime) {
                System.out.printf("%4d", n);
                if (++count % 10 == 0) {
                    System.out.println();
                }
            }
        }
        if (count % 10 != 0) {
            System.out.println();
        }
    }
}`;

const javaMock5 = raw`import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

/** 提取整数中的每个数字：逐位输出、逆序、求和。 */
public class Digits {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        System.out.println("请输入一个整数：");
        String line = in.readLine();
        if (line == null || line.trim().isEmpty()) {
            line = "20819";             // 没接键盘时用示例数
        }
        int n = Math.abs(Integer.parseInt(line.trim()));

        StringBuilder reversed = new StringBuilder();
        int sum = 0, bits = 0;
        int temp = n;
        while (temp > 0) {
            int d = temp % 10;
            reversed.append(d);
            sum += d;
            bits++;
            temp /= 10;
        }

        System.out.println("位数：" + bits);
        System.out.println("逆序：" + reversed);
        System.out.println("各位和：" + sum);
        System.out.print("逐位：");
        String forward = reversed.reverse().toString();
        for (int i = 0; i < forward.length(); i++) {
            System.out.print(forward.charAt(i) + " ");
        }
        System.out.println();
    }
}`;

const javaMock6 = raw`/** 数组排序：冒泡排序，升序输出。 */
public class BubbleSort {
    public static void main(String[] args) {
        int[] a = {49, 38, 65, 97, 76, 13, 27, 49, 55, 4};   // 考场从键盘读 10 个数

        for (int i = 0; i < a.length - 1; i++) {
            for (int j = 0; j < a.length - 1 - i; j++) {
                if (a[j] > a[j + 1]) {
                    int t = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = t;
                }
            }
        }

        System.out.print("排序后：");
        for (int v : a) {
            System.out.print(v + " ");
        }
        System.out.println();
    }
}`;

const javaMock7 = raw`/** 类的继承：抽象形状类 → 圆 / 矩形，多态求面积与周长。 */
abstract class Shape {
    private String name;

    Shape(String name) {
        this.name = name;
    }

    String getName() {
        return name;
    }

    abstract double area();

    abstract double perimeter();

    void show() {
        System.out.printf("%s：面积 %.2f，周长 %.2f%n", name, area(), perimeter());
    }
}

class Circle extends Shape {
    private double r;

    Circle(double r) {
        super("圆");
        this.r = r;
    }

    double area() {
        return Math.PI * r * r;
    }

    double perimeter() {
        return 2 * Math.PI * r;
    }
}

class Rectangle extends Shape {
    private double w, h;

    Rectangle(double w, double h) {
        super("矩形");
        this.w = w;
        this.h = h;
    }

    double area() {
        return w * h;
    }

    double perimeter() {
        return 2 * (w + h);
    }
}

public class ShapeDemo {
    public static void main(String[] args) {
        Shape[] shapes = {new Circle(3), new Rectangle(4, 5)};
        for (Shape s : shapes) {
            s.show();
        }
    }
}`;

const javaMock8 = raw`import java.awt.BorderLayout;
import java.awt.Font;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;

/** Swing 界面：两个按钮操作一个计数标签。 */
public class CounterWindow extends JFrame {
    private int count = 0;
    private final JLabel label = new JLabel("当前计数：0", JLabel.CENTER);

    public CounterWindow() {
        super("按钮与标签");
        label.setFont(new Font("宋体", Font.BOLD, 20));

        JButton add = new JButton("加一");
        JButton reset = new JButton("清零");
        add.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                label.setText("当前计数：" + (++count));
            }
        });
        reset.addActionListener(e -> {
            count = 0;
            label.setText("当前计数：0");
        });

        JPanel buttons = new JPanel();
        buttons.add(add);
        buttons.add(reset);

        getContentPane().setLayout(new BorderLayout());
        getContentPane().add(label, BorderLayout.CENTER);
        getContentPane().add(buttons, BorderLayout.SOUTH);

        setSize(320, 160);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setVisible(true);
    }

    public static void main(String[] args) {
        new CounterWindow();
    }
}`;

const javaMock9 = raw`import java.awt.Color;
import java.awt.Graphics;
import javax.swing.JFrame;
import javax.swing.JPanel;

/** 绘图：重写 paintComponent，画矩形、圆、三角形和字符串。 */
public class PaintPanel extends JPanel {
    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);

        g.setColor(Color.BLUE);
        g.drawRect(30, 30, 120, 80);

        g.setColor(Color.RED);
        g.drawOval(180, 30, 100, 100);

        g.setColor(Color.GREEN);
        g.drawLine(60, 220, 160, 140);
        g.drawLine(160, 140, 260, 220);
        g.drawLine(260, 220, 60, 220);

        g.setColor(Color.BLACK);
        g.drawString("paintComponent 绘图", 40, 270);
    }

    public static void main(String[] args) {
        JFrame frame = new JFrame("绘图板");
        frame.setContentPane(new PaintPanel());
        frame.setSize(400, 320);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);
    }
}`;

const javaMock10 = raw`/** 多线程：两个线程交替打印 1 到 20。 */
public class TwoThreads {
    private static int current = 1;
    private static final Object lock = new Object();

    public static void main(String[] args) {
        Runnable a = () -> print("A");
        Runnable b = () -> print("B");

        new Thread(a, "A").start();
        new Thread(b, "B").start();
    }

    private static void print(String name) {
        while (true) {
            synchronized (lock) {
                if (current > 20) {
                    lock.notifyAll();
                    return;
                }
                if ((current % 2 == 1) != name.equals("A")) {
                    try {
                        lock.wait();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                    continue;
                }
                System.out.println("线程 " + name + " 打印 " + current);
                current++;
                lock.notifyAll();
            }
        }
    }
}`;

const javaMock11 = raw`import java.applet.Applet;
import java.awt.Color;
import java.awt.Graphics;

/** Applet 图形处理：考场用 MyEclipse 8.6 可运行；JDK 17 上 javac 会报找不到 java.applet。 */
public class DrawApplet extends Applet {
    @Override
    public void paint(Graphics g) {
        g.setColor(Color.BLUE);
        g.drawRect(20, 20, 120, 80);

        g.setColor(Color.RED);
        g.drawOval(170, 20, 90, 90);

        g.setColor(Color.GREEN);
        g.drawLine(40, 220, 120, 150);
        g.drawLine(120, 150, 200, 220);
        g.drawLine(200, 220, 40, 220);

        g.setColor(Color.BLACK);
        g.drawString("Applet 里的 paint", 40, 260);
    }
}`;

const javaMockStarter = raw`import java.io.BufferedReader;
import java.io.InputStreamReader;

public class CharCount {
    public static void main(String[] args) throws Exception {
        // TODO：本题的代码写在这里
        // 需要从键盘读数据时：
        // BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        // String line = in.readLine();
    }
}`;

const javaMock12 = raw`import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class ScoreFile {
    public static void main(String[] args) throws IOException {
        String[] names = { "张三", "李四", "王五", "赵六", "钱七" };
        int[] marks = { 88, 92, 76, 65, 80 };

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < names.length; i++) {
            sb.append(names[i]).append(',').append(marks[i]).append('\n');
        }

        Path file = Path.of("scores.txt");
        Files.writeString(file, sb.toString(), StandardCharsets.UTF_8);

        List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
        int sum = 0;
        for (String line : lines) {
            sum += Integer.parseInt(line.split(",")[1].trim());
        }
        double avg = sum * 1.0 / lines.size();
        System.out.println("共 " + lines.size() + " 行");
        System.out.printf("平均分 %.2f%n", avg);
    }
}`;

const javaMockQuestions: LabQuestion[] = [
      {
        id: 'java-mock-1',
        no: 1,
        title: '字符统计：数字、字母、其它',
        score: '10 分',
        fileName: 'CharCount.java',
        starter: javaMockStarter,
        requirement:
          '编写程序，读入一行字符，统计其中的数字字符、英文字母和其它字符各有多少个，并输出三个计数。',
        checks: [
          '用 BufferedReader 或 Scanner 读入一行',
          'char 区间判断：数字 0-9、字母 a-z 与 A-Z 都要算',
          "其它字符走 else 分支（空格、标点都算其它）",
          '没有键盘输入时给一个示例字符串，保证远程运行也能出结果',
        ],
        answer: javaMock1,
      },
      {
        id: 'java-mock-2',
        no: 2,
        title: '水仙花数',
        score: '10 分',
        fileName: 'Narcissus.java',
        starter: javaMockStarter,
        requirement:
          '输出 100 到 999 之间所有的水仙花数。水仙花数是指各位数字的立方和等于该数本身的三位数。',
        checks: [
          '三位数拆位：百位 n/100，十位 n/10%10，个位 n%10',
          '立方和与原数比较',
          '四个答案：153、370、371、407',
        ],
        answer: javaMock2,
      },
      {
        id: 'java-mock-3',
        no: 3,
        title: '完数',
        score: '10 分',
        fileName: 'PerfectNumber.java',
        starter: javaMockStarter,
        requirement:
          '输出 1000 以内所有的完数，并按「6 = 1+2+3」的格式打印每个完数的因子。',
        checks: [
          '真因子：从 1 到 n-1 逐个试除',
          '累加因子与 n 比较',
          '答案：6、28、496',
          '重复执行时结果正确，不因残留状态出错',
        ],
        answer: javaMock3,
      },
      {
        id: 'java-mock-4',
        no: 4,
        title: '素数',
        score: '10 分',
        fileName: 'PrimeList.java',
        starter: javaMockStarter,
        requirement: '输出 1 到 100 之间的所有素数，每行输出 10 个。',
        checks: [
          'i 从 2 到 sqrt(n) 试除即可',
          '每输出一个计数加一，计数到 10 换行',
          '1 不是素数，循环从 2 开始',
        ],
        answer: javaMock4,
      },
      {
        id: 'java-mock-5',
        no: 5,
        title: '提取整数中的每个数字',
        score: '10 分',
        fileName: 'Digits.java',
        starter: javaMockStarter,
        requirement:
          '读入一个整数，输出它的位数、逆序结果、各位数字之和，并把每个数字按从左到右逐位打印出来。',
        checks: [
          '取位用取模：n % 10 得个位，n / 10 去掉个位',
          '逆序可以用 StringBuilder 边取边 append',
          '位数与各位和都在同一个循环里累计',
          ],
        answer: javaMock5,
      },
      {
        id: 'java-mock-6',
        no: 6,
        title: '数组排序：冒泡',
        score: '10 分',
        fileName: 'BubbleSort.java',
        starter: javaMockStarter,
        requirement:
          '读入 10 个整数存进数组，用冒泡排序把它们升序排好再输出。不要直接调用 Arrays.sort。',
        checks: [
          '两层循环，外层 n-1 趟，内层逐对比较',
          '相邻元素交换用临时变量',
          '内层循环上界随趟数递减（可加优化）',
          '外层每趟结束后末尾已有序',
        ],
        answer: javaMock6,
      },
      {
        id: 'java-mock-7',
        no: 7,
        title: '类的继承：几何形状',
        score: '10 分',
        fileName: 'ShapeDemo.java',
        starter: javaMockStarter,
        requirement:
          '声明抽象类 Shape，含名字、抽象方法 area() 与 perimeter()、以及显示信息的方法；再派生出圆和矩形，创建对象后用父类引用调用，打印面积与周长。',
        checks: [
          'abstract class + abstract 方法',
          '子类 super("圆") 调父类构造器',
          '父类引用指向子类对象（多态）',
          'printf("%.2f") 保留两位小数',
          '一个文件里只能有一个 public 类，文件名与它一致',
        ],
        answer: javaMock7,
      },
      {
        id: 'java-mock-8',
        no: 8,
        title: 'Swing 界面：按钮与标签',
        score: '10 分',
        fileName: 'CounterWindow.java',
        starter: javaMockStarter,
        requirement:
          '用 JFrame 做一个窗口：中间一个 JLabel 显示计数，底部两个按钮「加一」「清零」，点按钮更新标签文字。窗口 320×160，标题「按钮与标签」。',
        checks: [
          'JFrame 子类 + super(标题)',
          'BorderLayout 中间放标签、南部放按钮面板',
          'addActionListener 里改 label.setText',
          '计数用私有 int 成员保存',
          'setSize + setDefaultCloseOperation + setVisible(true)',
        ],
        answer: javaMock8,
      },
      {
        id: 'java-mock-9',
        no: 9,
        title: '绘图：重写 paintComponent',
        score: '10 分',
        fileName: 'PaintPanel.java',
        starter: javaMockStarter,
        requirement:
          '继承 JPanel 并重写 paintComponent，画出矩形、圆、三角形，再画一行字符串，放入 JFrame 显示。',
        checks: [
          '第一行必须 super.paintComponent(g)',
          'drawRect / drawOval / drawLine 各画一个',
          '三角形用三条 drawLine 首尾相连',
          'g.drawString 写字，坐标就是基线位置',
          'JFrame.setContentPane(new PaintPanel())',
        ],
        answer: javaMock9,
      },
      {
        id: 'java-mock-10',
        no: 10,
        title: '多线程：两个线程交替打印',
        score: '10 分',
        fileName: 'TwoThreads.java',
        starter: javaMockStarter,
        requirement:
          '开两个线程，让它们交替打印 1 到 20（A 打奇数、B 打偶数），用 synchronized 加 wait/notify 保证顺序。',
        checks: [
          '共享计数变量 + 同一把锁对象',
          'synchronized (lock) 里判断该谁打',
          '不轮到自己的线程 lock.wait()，打完 lock.notifyAll()',
          '打印完要退出循环，别死等',
          '也可以用一个标志位 + wait/notify 实现',
        ],
        answer: javaMock10,
      },
      {
        id: 'java-mock-11',
        no: 11,
        title: '附加：Applet 图形处理（了解）',
        score: '附加',
        fileName: 'DrawApplet.java',
        starter: javaMockStarter,
        requirement:
          '这一项只要求会写、认识，不要求在你本机跑通：考场的 MyEclipse 8.6 自带老 JDK，Applet 可用；你本机 JDK 17 已经移除 Applet，跑不了属正常。',
        checks: [
          '类继承 java.applet.Applet',
          '重写 paint(Graphics g)',
          '用 g.setColor / drawRect / drawOval / drawString 绘制',
          '页面里用 <applet code="DrawApplet.class" width=400 height=300> 加载',
          '本机 JDK 17 编译报错是预期的，别以为是代码写错',
        ],
        answer: javaMock11,
      },
      {
        id: 'java-mock-12',
        no: 12,
        title: '文件读写：写入 scores.txt 再读回统计',
        score: '10 分',
        fileName: 'ScoreFile.java',
        starter: javaMockStarter,
        requirement:
          '把 5 个学生的姓名和成绩写进 scores.txt，每行「姓名,分数」；写完从文件读回，打印行数和平均分。',
        checks: [
          '用 BufferedWriter 或 Files.write 写文件，编码 UTF-8',
          '每行格式固定为「姓名,分数」，用逗号分隔',
          '读回时用 split(",") 拆两半并解析成绩',
          '关闭流（try-with-resources 最省事）',
          '平均分先累加再除，注意整数除法的坑',
        ],
        answer: javaMock12,
      },
];

const pickJava = (index: number, id: string, no: number): LabQuestion => ({
  ...javaMockQuestions[index],
  id,
  no,
  score: '25 分',
});

const javaMockA: LabSet = {
  id: 'java-mock-a',
  name: '模拟卷 A',
  note: '基础语法与算法：字符统计、水仙花、完数、素数。',
  questions: [
    pickJava(0, 'java-ma-1', 1),
    pickJava(1, 'java-ma-2', 2),
    pickJava(2, 'java-ma-3', 3),
    pickJava(3, 'java-ma-4', 4),
  ],
};

const javaMockB: LabSet = {
  id: 'java-mock-b',
  name: '模拟卷 B',
  note: '数组、类与线程：取位、冒泡排序、继承、多线程。',
  questions: [
    pickJava(4, 'java-mb-1', 1),
    pickJava(5, 'java-mb-2', 2),
    pickJava(6, 'java-mb-3', 3),
    pickJava(9, 'java-mb-4', 4),
  ],
};

const javaMockC: LabSet = {
  id: 'java-mock-c',
  name: '模拟卷 C',
  note: '界面与文件：Swing 按钮、绘图、Applet、文件读写。',
  questions: [
    pickJava(7, 'java-mc-1', 1),
    pickJava(8, 'java-mc-2', 2),
    pickJava(10, 'java-mc-3', 3),
    pickJava(11, 'java-mc-4', 4),
  ],
};

const javaD1 = raw`public class Transpose {
    public static void main(String[] args) {
        int[][] a = { { 1, 2, 3 }, { 4, 5, 6 }, { 7, 8, 9 } };
        int[][] t = new int[a.length][a[0].length];
        for (int i = 0; i < a.length; i++) {
            for (int j = 0; j < a[i].length; j++) {
                t[j][i] = a[i][j];
            }
        }
        for (int i = 0; i < t.length; i++) {
            for (int j = 0; j < t[i].length; j++) {
                System.out.print(t[i][j] + " ");
            }
            System.out.println();
        }
    }
}`;

const javaD2 = raw`public class WordCount {
    public static void main(String[] args) {
        String text = "java is a simple object oriented language";
        String[] words = text.trim().split("\\s+");
        String longest = "";
        for (String w : words) {
            if (w.length() > longest.length()) {
                longest = w;
            }
        }
        System.out.println("单词数 " + words.length + "，最长 " + longest);
    }
}`;

const javaD3 = raw`public class Recursion {
    static long fact(int n) {
        return n <= 1 ? 1 : n * fact(n - 1);
    }

    static int fib(int n) {
        if (n <= 2) {
            return 1;
        }
        return fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        System.out.println("5! = " + fact(5));
        for (int i = 1; i <= 10; i++) {
            System.out.print(fib(i) + " ");
        }
        System.out.println();
    }
}`;

const javaD4 = raw`import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CharCountMap {
    public static void main(String[] args) {
        String text = "hello world";
        Map<Character, Integer> map = new HashMap<>();
        for (char c : text.toCharArray()) {
            if (c == ' ') {
                continue;
            }
            map.put(c, map.getOrDefault(c, 0) + 1);
        }
        List<Map.Entry<Character, Integer>> list = new ArrayList<>(map.entrySet());
        list.sort((a, b) -> b.getValue() - a.getValue());
        for (Map.Entry<Character, Integer> e : list) {
            System.out.println(e.getKey() + " : " + e.getValue());
        }
    }
}`;

const javaE1 = raw`interface Payable {
    double pay();
}

class Employee implements Payable {
    private final double salary;

    Employee(double salary) {
        this.salary = salary;
    }

    public double pay() {
        return salary;
    }
}

class HourlyWorker implements Payable {
    private final int hours;
    private final double rate;

    HourlyWorker(int hours, double rate) {
        this.hours = hours;
        this.rate = rate;
    }

    public double pay() {
        return hours * rate;
    }
}

public class PayDemo {
    public static void main(String[] args) {
        Payable[] staff = { new Employee(8000), new HourlyWorker(120, 60) };
        for (Payable p : staff) {
            System.out.printf("%.2f%n", p.pay());
        }
    }
}`;

const javaE2 = raw`import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class SafeRead {
    public static void main(String[] args) {
        try {
            String text = Files.readString(Path.of("nofile.txt"));
            System.out.println(text);
        } catch (IOException e) {
            System.out.println("文件读不到：" + e.getMessage());
        }

        try {
            int a = 10;
            int b = 0;
            System.out.println(a / b);
        } catch (ArithmeticException e) {
            System.out.println("除数不能为 0");
        } finally {
            System.out.println("结束");
        }
    }
}`;

const javaE3 = raw`import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public class DateCalc {
    public static void main(String[] args) {
        LocalDate exam = LocalDate.parse("2027-04-17");
        LocalDate today = LocalDate.now();
        long days = ChronoUnit.DAYS.between(today, exam);
        System.out.println("从今天到 " + exam + " 还有 " + days + " 天");
    }
}`;

const javaE4 = raw`import java.awt.BorderLayout;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;

public class TodoWindow extends JFrame {
    private final JTextField input = new JTextField(16);
    private final JTextArea list = new JTextArea(8, 24);

    public TodoWindow() {
        super("待办清单");
        list.setEditable(false);

        JPanel top = new JPanel();
        JButton add = new JButton("添加");
        add.addActionListener(e -> {
            String text = input.getText().trim();
            if (!text.isEmpty()) {
                list.append(text + "\n");
                input.setText("");
            }
        });
        top.add(input);
        top.add(add);

        getContentPane().add(top, BorderLayout.NORTH);
        getContentPane().add(new JScrollPane(list), BorderLayout.CENTER);

        setSize(320, 240);
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setVisible(true);
    }

    public static void main(String[] args) {
        new TodoWindow();
    }
}`;

const javaMockD: LabSet = {
  id: 'java-mock-d',
  name: '模拟卷 D',
  note: '二维数组、字符串、递归与集合。',
  questions: [
    {
      id: 'java-md-1',
      no: 1,
      title: '二维数组：矩阵转置',
      score: '25 分',
      fileName: 'Transpose.java',
      requirement: '有一个 3×3 的整数矩阵，写出转置矩阵并按行打印。',
      checks: ['两层循环遍历原矩阵', '转置时行列下标互换', '按行输出，每行结束后换行'],
      answer: javaD1,
    },
    {
      id: 'java-md-2',
      no: 2,
      title: '字符串：单词数与最长单词',
      score: '25 分',
      fileName: 'WordCount.java',
      requirement: '给出一句英文，统计单词个数，并找出长度最长的那个单词。',
      checks: ['split 用正则 \\s+ 切分', 'trim 去掉首尾空白', '遍历比较长度取最长'],
      answer: javaD2,
    },
    {
      id: 'java-md-3',
      no: 3,
      title: '递归：阶乘与斐波那契',
      score: '25 分',
      fileName: 'Recursion.java',
      requirement: '用递归写阶乘与斐波那契数列，输出 5 的阶乘和前 10 项斐波那契数。',
      checks: ['递归要有出口（n<=1 或 n<=2）', '递归式正确', '用循环打印前 10 项'],
      answer: javaD3,
    },
    {
      id: 'java-md-4',
      no: 4,
      title: '集合：统计字符出现次数',
      score: '25 分',
      fileName: 'CharCountMap.java',
      requirement: '用 HashMap 统计一个字符串里每个非空格字符出现的次数，按次数从高到低输出。',
      checks: ['HashMap 键是字符、值是次数', 'getOrDefault 累加', '按值排序用 entrySet + sort'],
      answer: javaD4,
    },
  ],
};

const javaMockE: LabSet = {
  id: 'java-mock-e',
  name: '模拟卷 E',
  note: '接口、异常、日期与综合界面。',
  questions: [
    {
      id: 'java-me-1',
      no: 1,
      title: '接口与多态：Payable',
      score: '25 分',
      fileName: 'PayDemo.java',
      requirement: '定义接口 Payable（方法 pay），让月薪员工与小时工各实现它，用接口数组调用并打印各自工资。',
      checks: ['interface 声明 pay()', '两个实现类都写 public double pay()', '接口引用指向实现类对象'],
      answer: javaE1,
    },
    {
      id: 'java-me-2',
      no: 2,
      title: '异常处理：读文件与除零',
      score: '25 分',
      fileName: 'SafeRead.java',
      requirement: '读取一个可能不存在的文件并捕获异常，另外演示除零异常的捕获，最后在 finally 里打印结束。',
      checks: ['try-catch 捕获 IOException', '异常后给用户可读提示', '除零走 ArithmeticException', 'finally 一定执行'],
      answer: javaE2,
    },
    {
      id: 'java-me-3',
      no: 3,
      title: '日期：距考试还有多少天',
      score: '25 分',
      fileName: 'DateCalc.java',
      requirement: '解析 yyyy-MM-dd 格式的日期字符串，计算它距今天还有多少天并输出。',
      checks: ['LocalDate.parse 解析字符串', 'ChronoUnit.DAYS.between 算差值', '结果按整数打印'],
      answer: javaE3,
    },
    {
      id: 'java-me-4',
      no: 4,
      title: '综合界面：待办清单',
      score: '25 分',
      fileName: 'TodoWindow.java',
      requirement: '用 JFrame 做窗口：上方输入框和「添加」按钮，中间文本区显示清单，点按钮把输入内容追加到文本区。',
      checks: ['JTextField + JButton + JTextArea', 'addActionListener 里读取并追加', 'JScrollPane 包文本区', 'setSize + setDefaultCloseOperation + setVisible'],
      answer: javaE4,
    },
  ],
};

export const javaSets: LabSet[] = [
  javaMockA,
  javaMockB,
  javaMockC,
  javaMockD,
  javaMockE,
  {
    id: 'java-a',
    name: '真题 A 卷',
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
    name: '真题 B 卷',
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
  name: '数据库 2017-04 卷',
  hideChecks: true,
  note: '打开 SQL Server，建立名为 School 的数据库，在其中建 StudentInfo、ClassInfo、MajorInfo 三张表。语句写在 1.sql 里，考试结束上传，可以重复提交覆盖。',
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

const mockStarterDdl = raw`-- 建库 + 建三张表：主键、外键、check、default 都要写
create table book (
  bookid int primary key
  -- 继续补：title / author / category / price / total
);
`;

/* ---------------------- 数据库模拟卷 B：数据库编程与管理维护 ---------------------- */

const sqlStarterQueryNote = raw`-- 示例库已就绪：book / reader / borrow 三张表已填好数据。
-- 直接写你的查询。
select `;

const mockB1 = raw`create database library;
use library;

create table borrow_log (
  logid      int primary key,
  borrowid   int not null,
  action     varchar(10) not null,
  logtime    datetime default current_timestamp,
  constraint fk_log_borrow foreign key (borrowid) references borrow(borrowid)
);`;

const mockB2 = raw`insert into borrow (borrowid, bookid, readerid, borrowdate, duedate)
values (9, 2, 3, '2026-10-20', '2026-11-20');

update borrow set duedate = '2026-11-30' where borrowid = 8;

select * from borrow where borrowid in (8, 9) order by borrowid;`;

const mockB3 = raw`delimiter //
create trigger trg_borrow_stock
before insert on borrow
for each row
begin
  declare borrowed int;
  declare stock int;
  select total into stock from book where bookid = new.bookid;
  select count(*) into borrowed from borrow
   where bookid = new.bookid and returndate is null;
  if borrowed >= stock then
    signal sqlstate '45000' set message_text = '库存不足，不能借阅';
  end if;
end//
delimiter ;`;

const mockB4 = raw`delimiter //
create trigger trg_return_log
after update on borrow
for each row
begin
  if old.returndate is null and new.returndate is not null then
    insert into borrow_log (logid, borrowid, action)
    values (new.borrowid, new.borrowid, '归还');
  end if;
end//
delimiter ;`;

const mockB5 = raw`set global event_scheduler = on;

create event ev_overdue_check
on schedule every 1 day
starts '2026-11-01 23:00:00'
do
begin
  update borrow
     set duedate = date_add(duedate, interval 7 day)
   where returndate is null and duedate < curdate();
end;`;

const mockB6 = raw`delimiter //
create procedure sp_reader_borrow(in p_reader int, out p_count int)
begin
  select count(*) into p_count from borrow where readerid = p_reader;
end//
delimiter ;

call sp_reader_borrow(1, @cnt);
select @cnt as 借阅次数;`;

const mockB7 = raw`delimiter //
create function fn_can_borrow(p_book int) returns varchar(10)
deterministic
begin
  declare stock int;
  declare borrowed int;
  select total into stock from book where bookid = p_book;
  select count(*) into borrowed from borrow
   where bookid = p_book and returndate is null;
  if borrowed < stock then
    return '可借';
  else
    return '已满';
  end if;
end//
delimiter ;

select bookid, title, fn_can_borrow(bookid) as 状态 from book;`;

const mockB8 = raw`select '未归还' as 状态, count(*) as 册数 from borrow where returndate is null
union all
select '已归还', count(*) from borrow where returndate is not null;`;

const mockB9 = raw`create view v_overdue as
select br.borrowid, r.readername, b.title, br.duedate
  from borrow br
  join reader r on r.readerid = br.readerid
  join book b on b.bookid = br.bookid
 where br.returndate is null and br.duedate < '2026-10-29';

select * from v_overdue order by duedate;`;

const mockB10 = raw`create user 'lib_clerk'@'localhost' identified by 'Lib@2026';

grant select, insert on library.borrow to 'lib_clerk'@'localhost';

flush privileges;`;

const mockB11 = raw`grant select on library.book to 'lib_clerk'@'localhost' with grant option;

revoke insert on library.borrow from 'lib_clerk'@'localhost';

show grants for 'lib_clerk'@'localhost';`;

const mockB12 = raw`-- 备份（命令行，不进 MySQL 客户端）
-- mysqldump -u root -p library > /backup/library_20261101.sql

-- 恢复
-- mysql -u root -p library < /backup/library_20261101.sql

-- 二进制日志：先确认已开启
show variables like 'log_bin';

-- 按时间点恢复（命令行）
-- mysqlbinlog --start-datetime='2026-11-01 00:00:00' binlog.000003 | mysql -u root -p library`;

export const sqlMockSetB: LabSet = {
  id: 'sql-mock-b-04736',
  name: '模拟卷 B',
  note: '按 04736 考纲第二、三块出的 B 卷：触发器等数据库编程 + 账号权限备份。满分 100，后 5 题是 MySQL 专属写法，页内跑不了。',
  questions: [
    {
      id: 'mock-b-1',
      mode: 'ddl',
      no: 1,
      title: '建日志表：默认时间与外键',
      score: '8 分',
      fileName: 'b01-ddl.sql',
      engine: 'MySQL',
      requirement:
        '建立 library 库，并建一张借还日志表 borrow_log：logid 主键，borrowid 非空，action 非空，logtime 默认取当前时间，borrowid 是指向 borrow(borrowid) 的外键且约束要命名。',
      checks: [
        'logid 声明 primary key',
        'borrowid、action 加 not null',
        'logtime 用 datetime default current_timestamp',
        '外键写成 constraint 名字 + references borrow(borrowid)',
      ],
      answer: mockB1,
      starter: mockStarterDdl,
    },
    {
      id: 'mock-b-2',
      mode: 'query',
      dataset: 'library',
      no: 2,
      title: '插入与更新：改一批数据',
      score: '8 分',
      fileName: 'b02-insert.sql',
      engine: 'MySQL',
      requirement:
        '向 borrow 表插入一条新记录：borrowid=9、bookid=2、readerid=3、borrowdate 为 2026-10-20、duedate 为 2026-11-20；再把 borrowid=8 的 duedate 改成 2026-11-30；最后查出这两条记录核对。',
      checks: [
        'insert 时把列名写全',
        'date 用字符串字面量',
        'update 带 where，不能整表更新',
        '最后用 select ... where borrowid in (8, 9) 核对',
      ],
      answer: mockB2,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-b-3',
      mode: 'mysql',
      no: 3,
      title: '触发器：借书前检查库存',
      score: '10 分',
      fileName: 'b03-trigger-before.sql',
      engine: 'MySQL',
      requirement:
        '给 borrow 表建一个 before insert 触发器 trg_borrow_stock：插入借阅记录时，先统计这本书已借出且未归还的册数，达到这本书的 total 就用 signal 报错「库存不足，不能借阅」并拒绝插入。',
      checks: [
        '用 delimiter // 与 delimiter ; 包住触发器体',
        'before insert on borrow for each row',
        'declare 局部变量 + select ... into 统计未归还册数',
        'if ... then signal sqlstate 结束语句',
        '这条是 MySQL 专属语法，页内跑不了',
      ],
      answer: mockB3,
    },
    {
      id: 'mock-b-4',
      mode: 'mysql',
      no: 4,
      title: '触发器：还书后写日志',
      score: '10 分',
      fileName: 'b04-trigger-after.sql',
      engine: 'MySQL',
      requirement:
        '建 after update 触发器 trg_return_log：当 borrow 表的 returndate 从空值改成有值时，往 borrow_log 插入一条 action 为「归还」的日志。',
      checks: [
        'after update on borrow for each row',
        '用 old.returndate is null and new.returndate is not null 判断「刚归还」',
        'insert into borrow_log 写入日志',
        '触发器体同样要 delimiter 包裹',
      ],
      answer: mockB4,
    },
    {
      id: 'mock-b-5',
      mode: 'mysql',
      no: 5,
      title: '事件：定时处理逾期',
      score: '8 分',
      fileName: 'b05-event.sql',
      engine: 'MySQL',
      requirement:
        '打开事件调度器，创建一个每天 23:00 执行的事件 ev_overdue_check：把已过期仍未归还的借阅记录 duedate 顺延 7 天。',
      checks: [
        'set global event_scheduler = on',
        'create event ... on schedule every 1 day starts ...',
        '事件体用 begin ... end 包住',
        'date_add(duedate, interval 7 day) 让日期加 7 天',
      ],
      answer: mockB5,
    },
    {
      id: 'mock-b-6',
      mode: 'mysql',
      no: 6,
      title: '存储过程：in 与 out 参数',
      score: '10 分',
      fileName: 'b06-procedure.sql',
      engine: 'MySQL',
      requirement:
        '创建存储过程 sp_reader_borrow(in p_reader int, out p_count int)，统计指定读者的借阅总次数写回 out 参数；调用它查读者 1 的借阅次数。',
      checks: [
        'create procedure ... (in ..., out ...)',
        'select count(*) into p_count 把结果写进 out 参数',
        '用 delimiter 包裹过程体',
        'call 时用 @变量 接 out 参数',
      ],
      answer: mockB6,
    },
    {
      id: 'mock-b-7',
      mode: 'mysql',
      no: 7,
      title: '存储函数：返回是否可借',
      score: '8 分',
      fileName: 'b07-function.sql',
      engine: 'MySQL',
      requirement:
        '创建存储函数 fn_can_borrow(p_book int)，已借出未归还册数少于 total 时返回「可借」，否则返回「已满」；用它查每本书的状态。',
      checks: [
        '带 returns varchar(10) 与 deterministic',
        '函数体用 return 返回结果',
        '查询里把函数放在 select 列表中直接用',
        '不要把函数写成存储过程',
      ],
      answer: mockB7,
    },
    {
      id: 'mock-b-8',
      mode: 'query',
      dataset: 'library',
      no: 8,
      title: '联合查询：两类结果拼一起',
      score: '8 分',
      fileName: 'b08-union.sql',
      engine: 'MySQL',
      requirement: '用一条 SQL 同时给出「未归还册数」与「已归还册数」，两行两列，第一列写状态名。',
      checks: ['用 union all 合并两段查询', '两段查询的列数、列顺序要一致', '用别名统一列名'],
      answer: mockB8,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-b-9',
      mode: 'query',
      dataset: 'library',
      no: 9,
      title: '视图：逾期未还清单',
      score: '8 分',
      fileName: 'b09-view.sql',
      engine: 'MySQL',
      requirement:
        '创建视图 v_overdue，列出已过应还日期（以 2026-10-29 为准）仍未归还的借阅记录：借阅号、读者姓名、书名、应还日期；再查询这个视图。',
      checks: ['create view 视图名 as select ...', '三张表用 join on 连接', '未归还是 returndate is null', '查询视图当普通表用'],
      answer: mockB9,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-b-10',
      mode: 'mysql',
      no: 10,
      title: '用户账号：创建并授权',
      score: '8 分',
      fileName: 'b10-user.sql',
      engine: 'MySQL',
      requirement: '创建只能从本机登录的用户 lib_clerk（密码 Lib@2026），只授予它对 library.borrow 表的查询和插入权限。',
      checks: [
        "create user 'lib_clerk'@'localhost' identified by '...'",
        'grant select, insert on library.borrow to ...',
        '权限粒度到表，不要给 all',
        'flush privileges 让权限立即生效',
      ],
      answer: mockB10,
    },
    {
      id: 'mock-b-11',
      mode: 'mysql',
      no: 11,
      title: '权限：转移与撤销',
      score: '7 分',
      fileName: 'b11-grant.sql',
      engine: 'MySQL',
      requirement:
        '给 lib_clerk 增加「能把 book 表的查询权限转授给别人」的权限；再收回它对 borrow 表的插入权限；最后查看它当前的全部权限。',
      checks: [
        'with grant option 才允许转授',
        'revoke insert on ... from ...',
        "show grants for 'lib_clerk'@'localhost'",
      ],
      answer: mockB11,
    },
    {
      id: 'mock-b-12',
      mode: 'mysql',
      no: 12,
      title: '备份恢复与二进制日志',
      score: '7 分',
      fileName: 'b12-backup.sql',
      engine: 'MySQL',
      requirement:
        '写出三件事对应的命令：①把 library 库整库备份到 /backup/library_20261101.sql；②从该文件恢复；③用二进制日志做按时间点恢复（以 2026-11-01 00:00:00 之后为例）。',
      checks: [
        'mysqldump 备份库',
        'mysql < 备份文件 恢复',
        'show variables like log_bin 确认二进制日志已开',
        'mysqlbinlog 配合 start-datetime 做时间点恢复',
      ],
      answer: mockB12,
    },
  ],
};

/* ---------------------- 数据库模拟卷 C：SQL 交互操作综合 ---------------------- */

const mockC1 = raw`create database library;
use library;

create table book (
  bookid   int primary key,
  title    varchar(40) not null,
  author   varchar(20),
  category varchar(10),
  price    decimal(6,2) check (price > 0),
  total    int default 1
);

create table reader (
  readerid   int primary key,
  readername varchar(20) not null,
  sex        char(1),
  dept       varchar(20),
  regdate    date
);

create table borrow (
  borrowid   int primary key,
  bookid     int not null,
  readerid   int not null,
  borrowdate date not null,
  duedate    date,
  returndate date,
  constraint fk_borrow_book foreign key (bookid) references book(bookid),
  constraint fk_borrow_reader foreign key (readerid) references reader(readerid)
);`;

const mockC2 = raw`select bookid, title, price
  from book
 where category = '计算机' and price < 100
 order by price desc
 limit 2;`;

const mockC3 = raw`select count(*) as 种数,
       min(price) as 最低价,
       max(price) as 最高价,
       round(avg(price), 2) as 平均价
  from book;`;

const mockC4 = raw`select category as 分类, count(*) as 种数, sum(total) as 总册数
  from book
 group by category
having sum(total) >= 2
 order by 总册数 desc;`;

const mockC5 = raw`select r.readername, count(br.borrowid) as 借阅次数
  from reader r
  left join borrow br on br.readerid = r.readerid
 group by r.readerid, r.readername
 order by 借阅次数 desc, r.readerid;`;

const mockC6 = raw`select distinct r.readername
  from reader r
 where r.readerid in (
       select br.readerid
         from borrow br
        where br.bookid in (select bookid from book where category = '计算机')
       )
 order by r.readername;`;

const mockC7 = raw`-- MySQL 可以写 price > all (子查询)；页内的 SQLite 不认 all，用 max 等价写法
select bookid, title, price
  from book
 where price > (select max(price) from book where category = '文学')
 order by price;`;

const mockC8 = raw`select b.bookid, b.title
  from book b
 where not exists (select 1 from borrow br where br.bookid = b.bookid)
 order by b.bookid;`;

const mockC9 = raw`select title from book where category = '计算机'
union
select title from book where price > 80
 order by title;`;

const mockC10 = raw`create view v_reader_borrow as
select r.readerid, r.readername, count(br.borrowid) as 借阅次数
  from reader r
  left join borrow br on br.readerid = r.readerid
 group by r.readerid, r.readername;

select * from v_reader_borrow order by 借阅次数 desc;`;

const mockC11 = raw`create index idx_book_category on book(category);

select bookid, title, price from book where category = '计算机';

explain query plan
select bookid, title from book where category = '计算机';`;

const mockC12 = raw`delimiter //
create trigger trg_no_delete_borrowed
before delete on book
for each row
begin
  declare cnt int;
  select count(*) into cnt from borrow
   where bookid = old.bookid and returndate is null;
  if cnt > 0 then
    signal sqlstate '45000' set message_text = '还有未归还的借阅记录，不能删除';
  end if;
end//
delimiter ;`;

export const sqlMockSetC: LabSet = {
  id: 'sql-mock-c-04736',
  name: '模拟卷 C',
  note: '按 04736 考纲第一块出的 C 卷：SQL 交互操作综合（建表、各类查询、视图、索引）。满分 100。',
  questions: [
    {
      id: 'mock-c-1',
      mode: 'ddl',
      no: 1,
      title: '建库建表：三表与命名外键',
      score: '8 分',
      fileName: 'c01-ddl.sql',
      engine: 'MySQL',
      requirement:
        '建立 library 库与 book、reader、borrow 三张表。book：bookid 主键，title 非空，price 带 check 大于 0，total 默认 1。reader：readerid 主键，readername 非空。borrow：borrowid 主键，bookid 与 readerid 非空，borrowdate 非空，两个外键都要命名。',
      checks: [
        '三张表都声明主键',
        'price 用 check (price > 0)',
        'total 用 default 1',
        '外键写 constraint 名字 + references',
        'borrowdate 加 not null',
      ],
      answer: mockC1,
      starter: mockStarterDdl,
    },
    {
      id: 'mock-c-2',
      mode: 'query',
      dataset: 'library',
      no: 2,
      title: '条件查询：多条件 + 排序 + 取前几行',
      score: '8 分',
      fileName: 'c02-select.sql',
      engine: 'MySQL',
      requirement: '查计算机类里价格低于 100 的图书，列出图书号、书名、价格，价格从高到低，只取前 2 条。',
      checks: ['两个条件用 and 连接', 'order by price desc', 'limit 2'],
      answer: mockC2,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-c-3',
      mode: 'query',
      dataset: 'library',
      no: 3,
      title: '聚合查询：一次算四个值',
      score: '8 分',
      fileName: 'c03-agg.sql',
      engine: 'MySQL',
      requirement: '统计全部图书的种数、最低价、最高价和平均价，平均价保留两位小数，每个值都要有列名。',
      checks: ['count(*) 算种数', 'min/max 取价格区间', 'round(avg(price), 2) 保留两位', '用 as 起中文列名'],
      answer: mockC3,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-c-4',
      mode: 'query',
      dataset: 'library',
      no: 4,
      title: '分组与 having：按分类汇总',
      score: '8 分',
      fileName: 'c04-group.sql',
      engine: 'MySQL',
      requirement: '按分类统计图书种数和总册数，只保留总册数不少于 2 的分类，按总册数从多到少排。',
      checks: ['group by category', 'having 筛分组结果，不能用 where', 'count(*) 与 sum(total) 分别算', 'order by 总册数 desc'],
      answer: mockC4,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-c-5',
      mode: 'query',
      dataset: 'library',
      no: 5,
      title: '连接查询：没借过的也要列出来',
      score: '10 分',
      fileName: 'c05-join.sql',
      engine: 'MySQL',
      requirement: '列出每位读者的姓名和借阅次数，一次没借过的读者也要出现（次数显示 0），按次数从多到少排。',
      checks: [
        '用 left join，reader 在左',
        '连接条件是 br.readerid = r.readerid',
        'count 要数借阅表的主键，不能写 count(*)',
        'group by 同时带上 readerid 与 readername',
      ],
      answer: mockC5,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-c-6',
      mode: 'query',
      dataset: 'library',
      no: 6,
      title: '嵌套查询：借过计算机类图书的人',
      score: '8 分',
      fileName: 'c06-in.sql',
      engine: 'MySQL',
      requirement: '查出借过「计算机」类图书的读者姓名，重名只出现一次，按姓名排序。',
      checks: ['两层子查询：先找书号，再找读者号', 'in 子查询', 'distinct 去重', 'order by readername'],
      answer: mockC6,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-c-7',
      mode: 'query',
      dataset: 'library',
      no: 7,
      title: '比较子查询：高于某类全部图书',
      score: '8 分',
      fileName: 'c07-all.sql',
      engine: 'MySQL',
      requirement: '查出价格高于「文学类所有图书价格」的图书，列出图书号、书名、价格，按价格从低到高。',
      checks: [
        '子查询只取文学类图书的 price',
        'MySQL 写法是 price > all (子查询)，页内用 max 等价',
        'order by price',
      ],
      answer: mockC7,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-c-8',
      mode: 'query',
      dataset: 'library',
      no: 8,
      title: '存在量词：从没被借过的书',
      score: '8 分',
      fileName: 'c08-exists.sql',
      engine: 'MySQL',
      requirement: '查出从没被借过的图书，列出图书号和书名，按图书号排序。',
      checks: ['用 not exists 相关子查询', '子查询里写 br.bookid = b.bookid 把内外表关联起来', '也可以写 not in，但要说明两者差异', 'order by bookid'],
      answer: mockC8,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-c-9',
      mode: 'query',
      dataset: 'library',
      no: 9,
      title: '联合查询：union 去重',
      score: '8 分',
      fileName: 'c09-union.sql',
      engine: 'MySQL',
      requirement: '把「计算机类图书的书名」和「价格高于 80 的图书书名」合并成一个结果，重复的书名只留一行，按书名排序。',
      checks: ['union 会去重，union all 不去重', '两段查询的列数与类型要一致', 'order by 写在最后一段之后', '排序可写列名也可写序号'],
      answer: mockC9,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-c-10',
      mode: 'query',
      dataset: 'library',
      no: 10,
      title: '视图：创建并查询',
      score: '9 分',
      fileName: 'c10-view.sql',
      engine: 'MySQL',
      requirement: '创建视图 v_reader_borrow，包含读者号、姓名、借阅次数（没借过的算 0）；再查询该视图，按借阅次数从多到少排。',
      checks: ['create view 视图名 as select ...', '视图里用 left join 保证没借过的读者也在', 'group by 写全非聚合列', '查询视图与查表写法一致'],
      answer: mockC10,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-c-11',
      mode: 'query',
      dataset: 'library',
      no: 11,
      title: '索引：给常用条件建索引',
      score: '8 分',
      fileName: 'c11-index.sql',
      engine: 'MySQL',
      requirement: '给 book 表的 category 列建一个名为 idx_book_category 的普通索引，然后按分类查询一次，并用执行计划确认走了索引。',
      checks: [
        'create index 索引名 on 表(列)',
        '索引名与题目要求一致',
        '查询条件要能命中索引列',
        'MySQL 用 explain，SQLite 用 explain query plan',
      ],
      answer: mockC11,
      starter: sqlStarterQueryNote,
    },
    {
      id: 'mock-c-12',
      mode: 'mysql',
      no: 12,
      title: '触发器：不许删还有借阅的书',
      score: '9 分',
      fileName: 'c12-trigger.sql',
      engine: 'MySQL',
      requirement: '给 book 表建 before delete 触发器 trg_no_delete_borrowed：这本书还有未归还的借阅记录时，用 signal 报错「还有未归还的借阅记录，不能删除」并阻止删除。',
      checks: [
        'delimiter // 包裹触发器体',
        'before delete on book for each row',
        '用 old.bookid 取被删的那本书',
        'declare 变量 + select count(*) into 统计未归还',
        'if ... then signal sqlstate 报错',
      ],
      answer: mockC12,
    },
  ],
};
export const sqlMockSetD: LabSet = {
  id: 'sql-mock-d-04736',
  name: '模拟卷 D',
  note: '按 04736 考纲第一、三、四块出的 D 卷：建表、多条件查询、连接与分组、视图与索引、更新、触发器与存储过程。满分 100，前 10 题可在页内直接跑。',
  questions: [
    {
      id: 'sql-d-1',
      no: 1,
      title: '建表：教师表与默认值',
      score: '8 分',
      fileName: 'd01-teacher.sql',
      engine: 'SQL',
      mode: 'ddl',
      dataset: 'school',
      requirement:
        '在 school 库里建一张 teacherinfo 表：教师编号 tid（整数，主键）、姓名 tname（varchar(20)，非空）、职称 title（varchar(10)，默认值为「讲师」）、入职日期 hiredate（date）。',
      checks: ['主键在 tid 上', 'tname 加 not null', "title 用 default '讲师'", 'hiredate 用 date 类型'],
      answer: raw`create table teacherinfo (
  tid      integer primary key,
  tname    varchar(20) not null,
  title    varchar(10) default '讲师',
  hiredate date
);`,
    },
    {
      id: 'sql-d-2',
      no: 2,
      title: '条件查询：区间与姓氏',
      score: '8 分',
      fileName: 'd02-between.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'school',
      requirement: '查询成绩在 85 到 96 之间（含两端）且姓张的学生的姓名、班级编号和成绩。',
      checks: ['用 between 表示闭区间', "姓氏用 like '张%'", '两个条件同时成立'],
      answer: raw`select studentname, classid, studentmark
from studentinfo
where studentmark between 85 and 96
  and studentname like '张%';`,
    },
    {
      id: 'sql-d-3',
      no: 3,
      title: '分组统计：每班人数与平均分',
      score: '8 分',
      fileName: 'd03-group.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'school',
      requirement: '按班级统计人数与平均分，输出班级编号、人数、平均分（保留两位小数），并按平均分从高到低排列。',
      checks: ['group by 班级编号', 'count(*) 算人数', 'round(avg(...), 2) 保留两位', 'order by 平均分 desc'],
      answer: raw`select classid,
       count(*) as 人数,
       round(avg(studentmark), 2) as 平均分
from studentinfo
group by classid
order by 平均分 desc;`,
    },
    {
      id: 'sql-d-4',
      no: 4,
      title: '分组后筛选：平均分低于 70',
      score: '8 分',
      fileName: 'd04-having.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'school',
      requirement: '找出平均分低于 70 分的班级，输出班级编号和平均分（保留两位小数）。',
      checks: ['对分组结果筛选要用 having', 'avg 不能出现在 where 里', '平均分保留两位'],
      answer: raw`select classid, round(avg(studentmark), 2) as 平均分
from studentinfo
group by classid
having avg(studentmark) < 70;`,
    },
    {
      id: 'sql-d-5',
      no: 5,
      title: '子查询：高于全校平均分',
      score: '8 分',
      fileName: 'd05-subquery.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'school',
      requirement: '查询成绩高于全校平均分的学生姓名和成绩。',
      checks: ['子查询先算出全校平均分', '外层用 > 比较', '平均分那条不需要出现在结果里'],
      answer: raw`select studentname, studentmark
from studentinfo
where studentmark > (select avg(studentmark) from studentinfo);`,
    },
    {
      id: 'sql-d-6',
      no: 6,
      title: '相关子查询：全班都及格的班级',
      score: '8 分',
      fileName: 'd06-notexists.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'school',
      requirement: '用 not exists 查出全班都没有不及格（成绩低于 60）学生的班级编号。',
      checks: ['not exists 里做关联', '关联条件用班级编号', '不及格条件放在子查询里', '题目点名要 not exists，别用 not in'],
      answer: raw`select c.classid
from classinfo c
where not exists (
  select 1
  from studentinfo s
  where s.classid = c.classid
    and s.studentmark < 60
);`,
    },
    {
      id: 'sql-d-7',
      no: 7,
      title: '联合查询：两个条件合并',
      score: '8 分',
      fileName: 'd07-union.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'school',
      requirement: '查出男生成绩大于 90 分、或女生成绩大于 95 分的学生姓名、性别和成绩，两条查询用 union 合并。',
      checks: ['用 union 合并两条 select', '两条的列数和顺序一致', '不要用 or 代替 union'],
      answer: raw`select studentname, studentsex, studentmark
from studentinfo
where studentsex = '男' and studentmark > 90
union
select studentname, studentsex, studentmark
from studentinfo
where studentsex = '女' and studentmark > 95;`,
    },
    {
      id: 'sql-d-8',
      no: 8,
      title: '视图：班级统计',
      score: '8 分',
      fileName: 'd08-view.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'school',
      requirement: '创建一个视图 v_class_stat，包含班级编号、人数、平均分（保留两位小数），然后查询这个视图。',
      checks: ['create view 名字正确', '视图里做分组统计', '建完再 select * 验证'],
      answer: raw`create view v_class_stat as
select classid,
       count(*) as 人数,
       round(avg(studentmark), 2) as 平均分
from studentinfo
group by classid;

select * from v_class_stat;`,
    },
    {
      id: 'sql-d-9',
      no: 9,
      title: '索引：给成绩列建索引',
      score: '8 分',
      fileName: 'd09-index.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'school',
      requirement: '给 studentinfo 表的 studentmark 列建一个普通索引，索引名为 idx_student_mark。',
      checks: ['create index 语法', '索引名与列名正确', '建立在 studentinfo 表上'],
      answer: raw`create index idx_student_mark on studentinfo(studentmark);`,
    },
    {
      id: 'sql-d-10',
      no: 10,
      title: '数据更新：成绩低于 60 分加 5 分',
      score: '8 分',
      fileName: 'd10-update.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'school',
      requirement:
        '把成绩低于 60 分的学生成绩统一加 5 分，加分后不能超过 100；改完查询学生成绩确认结果。',
      checks: ['where 只筛低于 60 分的行', '加分后要封顶 100', '改完用 select 确认'],
      answer: raw`update studentinfo
set studentmark = case when studentmark + 5 > 100 then 100 else studentmark + 5 end
where studentmark < 60;

select studentname, studentmark
from studentinfo
order by studentmark;`,
    },
    {
      id: 'sql-d-11',
      no: 11,
      title: '触发器：成绩不能为负',
      score: '10 分',
      fileName: 'd11-trigger.sql',
      engine: 'SQL',
      mode: 'mysql',
      dataset: 'school',
      requirement:
        '给 studentinfo 表写一个 before insert 触发器 trg_student_mark：插入记录时如果成绩是负数，就把它改成 0 再插入。',
      checks: ['delimiter // 包住触发器体', 'before insert on studentinfo for each row', '用 if ... then set new.studentmark = 0', '这条是 MySQL 专属写法，页内跑不了'],
      answer: raw`delimiter //
create trigger trg_student_mark
before insert on studentinfo
for each row
begin
  if new.studentmark < 0 then
    set new.studentmark = 0;
  end if;
end //
delimiter ;`,
    },
    {
      id: 'sql-d-12',
      no: 12,
      title: '存储过程：按班级统计',
      score: '10 分',
      fileName: 'd12-proc.sql',
      engine: 'SQL',
      mode: 'mysql',
      dataset: 'school',
      requirement:
        '写一个存储过程 proc_class_stat，传入班级编号，用两个 out 参数返回该班人数和平均分。',
      checks: ['delimiter // 包住过程体', 'in 班级编号、out 人数、out 平均分', '过程体里用 select ... into', '调用时用 set @x 接收 out 参数'],
      answer: raw`delimiter //
create procedure proc_class_stat(
  in  p_classid char(5),
  out p_count   int,
  out p_avg     decimal(5,2)
)
begin
  select count(*), round(avg(studentmark), 2)
    into p_count, p_avg
  from studentinfo
  where classid = p_classid;
end //
delimiter ;

call proc_class_stat('G0208', @cnt, @avg);
select @cnt as 人数, @avg as 平均分;`,
    },
  ],
};

export const sqlMockSetE: LabSet = {
  id: 'sql-mock-e-04736',
  name: '模拟卷 E',
  note: '按 04736 考纲出的 E 卷，数据换成图书借阅库：建表、区间查询、三表连接、分组、子查询、视图、索引、删除、触发器与存储函数。满分 100。',
  questions: [
    {
      id: 'sql-e-1',
      no: 1,
      title: '建表：订单表与检查约束',
      score: '8 分',
      fileName: 'e01-order.sql',
      engine: 'SQL',
      mode: 'ddl',
      dataset: 'library',
      requirement:
        '建一张 orderinfo 表：订单号 oid（整数，主键）、图书编号 bookid（整数，非空）、数量 qty（整数，默认 1，且必须大于 0）、下单日期 orderdate（date）。',
      checks: ['oid 主键', 'bookid 加 not null', 'qty 有 default 1 与 check (qty > 0)', 'orderdate 用 date'],
      answer: raw`create table orderinfo (
  oid       integer primary key,
  bookid    integer not null,
  qty       integer default 1 check (qty > 0),
  orderdate date
);`,
    },
    {
      id: 'sql-e-2',
      no: 2,
      title: '条件查询：价格区间与库存',
      score: '8 分',
      fileName: 'e02-range.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'library',
      requirement: '查出价格在 30 到 60 元之间、且库存大于 1 的图书编号、书名和价格。',
      checks: ['价格用 between 30 and 60', '库存用 total > 1', '两个条件同时满足'],
      answer: raw`select bookid, title, price
from book
where price between 30 and 60
  and total > 1;`,
    },
    {
      id: 'sql-e-3',
      no: 3,
      title: '三表连接：借阅明细',
      score: '8 分',
      fileName: 'e03-join.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'library',
      requirement: '列出每条借阅记录的读者姓名、书名和借阅日期，按借阅日期从早到晚排列。',
      checks: ['borrow 分别连 reader 与 book', '两个连接条件都写全', '按借阅日期排序'],
      answer: raw`select r.readername, b.title, br.borrowdate
from borrow br
join reader r on r.readerid = br.readerid
join book b on b.bookid = br.bookid
order by br.borrowdate;`,
    },
    {
      id: 'sql-e-4',
      no: 4,
      title: '分组统计：借阅次数',
      score: '8 分',
      fileName: 'e04-count.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'library',
      requirement: '统计每本书被借阅的次数，只列出被借过 2 次及以上的，输出书名和次数并按次数从高到低排列。',
      checks: ['按书分组', 'count(*) 算次数', 'having 筛 2 次及以上', '按次数排序'],
      answer: raw`select b.title, count(*) as 次数
from borrow br
join book b on b.bookid = br.bookid
group by b.bookid, b.title
having count(*) >= 2
order by 次数 desc;`,
    },
    {
      id: 'sql-e-5',
      no: 5,
      title: '子查询：谁借过这本书',
      score: '8 分',
      fileName: 'e05-in.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'library',
      requirement: '查出借过《数据库系统概论》的读者姓名。',
      checks: ['内层查出该书对应的读者编号', '外层用 in 匹配', '书名条件放在内层'],
      answer: raw`select readername
from reader
where readerid in (
  select br.readerid
  from borrow br
  join book b on b.bookid = br.bookid
  where b.title = '数据库系统概论'
);`,
    },
    {
      id: 'sql-e-6',
      no: 6,
      title: '相关子查询：没借过某本书的读者',
      score: '8 分',
      fileName: 'e06-notexists.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'library',
      requirement: '用 not exists 查出没有借过《人间词话》的读者姓名。',
      checks: ['not exists 做关联', '关联条件用读者编号', '书名条件写在子查询里', '题目要求 not exists'],
      answer: raw`select r.readername
from reader r
where not exists (
  select 1
  from borrow br
  join book b on b.bookid = br.bookid
  where br.readerid = r.readerid
    and b.title = '人间词话'
);`,
    },
    {
      id: 'sql-e-7',
      no: 7,
      title: '联合查询：贵书与仅一本',
      score: '8 分',
      fileName: 'e07-union.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'library',
      requirement: '查出价格高于 80 元的图书，以及库存只有 1 本的图书，两类结果用 union 合并，输出书名和价格。',
      checks: ['两条 select 列一致', '用 union 合并', '两条条件分别是价格与库存'],
      answer: raw`select title, price from book where price > 80
union
select title, price from book where total = 1;`,
    },
    {
      id: 'sql-e-8',
      no: 8,
      title: '视图：逾期未还',
      score: '8 分',
      fileName: 'e08-view.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'library',
      requirement:
        '创建视图 v_late，包含逾期未还的借阅记录：借阅号、书名、读者姓名、应还日期；条件是还没归还且应还日期早于今天。然后查询这个视图。',
      checks: ['returndate is null 表示未归还', "duedate < date('now') 表示逾期", '视图连三张表', '建完 select * 验证'],
      answer: raw`create view v_late as
select br.borrowid, b.title, r.readername, br.duedate
from borrow br
join book b on b.bookid = br.bookid
join reader r on r.readerid = br.readerid
where br.returndate is null
  and br.duedate < date('now');

select * from v_late;`,
    },
    {
      id: 'sql-e-9',
      no: 9,
      title: '索引：按读者查借阅',
      score: '8 分',
      fileName: 'e09-index.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'library',
      requirement: '给 borrow 表的 readerid 列建一个普通索引，索引名为 idx_borrow_reader。',
      checks: ['create index 语法', '建在 borrow 表上', '索引名正确'],
      answer: raw`create index idx_borrow_reader on borrow(readerid);`,
    },
    {
      id: 'sql-e-10',
      no: 10,
      title: '数据删除：清理旧记录',
      score: '8 分',
      fileName: 'e10-delete.sql',
      engine: 'SQL',
      mode: 'query',
      dataset: 'library',
      requirement: '删除 2026 年 4 月之前借出、并且已经归还的借阅记录；删完统计 borrow 表还剩多少行。',
      checks: ['where 同时限定借出日期与已归还', '用 delete 而不是 truncate', "日期比较用 '2026-04-01'", '删完 count(*) 确认'],
      answer: raw`delete from borrow
where borrowdate < '2026-04-01'
  and returndate is not null;

select count(*) as 剩余记录 from borrow;`,
    },
    {
      id: 'sql-e-11',
      no: 11,
      title: '触发器：库存为 0 时拒绝借阅',
      score: '10 分',
      fileName: 'e11-trigger.sql',
      engine: 'SQL',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '写一个 before insert 触发器 trg_borrow_stock：插入借阅记录时，如果这本书的库存 total 已经是 0，就报错「库存不足」并拒绝这次插入。',
      checks: ['delimiter // 包住触发器体', 'before insert on borrow for each row', 'select total into 变量 判断', '用 signal sqlstate 抛错', '这条是 MySQL 专属写法，页内跑不了'],
      answer: raw`delimiter //
create trigger trg_borrow_stock
before insert on borrow
for each row
begin
  declare stock int;
  select total into stock from book where bookid = new.bookid;
  if stock <= 0 then
    signal sqlstate '45000' set message_text = '库存不足';
  end if;
end //
delimiter ;`,
    },
    {
      id: 'sql-e-12',
      no: 12,
      title: '存储函数：在借数量',
      score: '10 分',
      fileName: 'e12-func.sql',
      engine: 'SQL',
      mode: 'mysql',
      dataset: 'library',
      requirement:
        '写一个存储函数 fn_borrowing，传入读者编号，返回该读者当前未归还的借书数量。',
      checks: ['delimiter // 包住函数体', 'returns int + deterministic', '用 select count(*) into 返回', '调用时 select fn_borrowing(1)', '这条是 MySQL 专属写法，页内跑不了'],
      answer: raw`delimiter //
create function fn_borrowing(p_reader int)
returns int
deterministic
begin
  declare cnt int;
  select count(*) into cnt
  from borrow
  where readerid = p_reader and returndate is null;
  return cnt;
end //
delimiter ;

select fn_borrowing(1) as 在借数量;`,
    },
  ],
};

export default { javaSets, sqlMockSetD, sqlMockSetE, sqlSet, sqlMockSetB, sqlMockSetC };
