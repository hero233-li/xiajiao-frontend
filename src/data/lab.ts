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

export const javaSets: LabSet[] = [
  {
    id: 'java-a',
    name: 'A 卷',
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
    name: 'B 卷',
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
const queryStarter = raw`-- 示例库已就绪：majorinfo（专业 2 条）、classinfo（班级 3 条）、studentinfo（学生 17 条）
-- 直接写查询，例如：select * from studentinfo where studentage > 20;

select `;

const sqlStarter = raw`-- 先把这套表建出来再写题目里的语句
drop database if exists school;
create database school;
use school;

create table majorinfo (
  majorid int primary key,
  major   varchar(20)
);

create table classinfo (
  classid     char(5) primary key,
  classnumber int,
  majorid     int
);

create table studentinfo (
  studentid    int primary key,
  studentname  varchar(20) unique,
  studentsex   char(1),
  studentage   smallint,
  studentmark  smallint,
  entrancedate datetime,
  classid      char(5)
);`;


export const sqlSet: LabSet = {
  id: 'sql-201704',
  name: '数据库 2017-04 卷',
  note: '闭卷上机 1 小时，MySQL 5.5+。SQL 交互操作 + 数据库编程。',
  questions: [
    {
      id: 'sql-1',
      mode: 'ddl',
      no: 1,
      title: '建库建表与完整性约束',
      score: '建表题',
      fileName: '01-ddl.sql',
      engine: 'MySQL',
      requirement:
        '建立 school 库，建 majorinfo（专业）、classinfo（班级）、studentinfo（学生）三张表，主键、唯一、检查约束、外键都要写全，外键最后用 alter table 补也可以。',
      checks: [
        'drop database if exists + create database + use',
        '三张表都有主键，studentname 加 unique',
        'studentage 加 check，studentsex 用 char(1)',
        'classinfo.majorid 外键指向 majorinfo，studentinfo.classid 外键指向 classinfo',
        '注意：原始资料里 studentinfo 建表少写了一个列名（只有 smallint），照抄会报错',
      ],
      answer: sqlQ1,
      starter: sqlStarter,
    },
    {
      id: 'sql-2',
      mode: 'query',
      no: 2,
      title: '条件查询：日期 + 模糊匹配',
      score: '查询题',
      fileName: '02-select.sql',
      engine: 'MySQL',
      requirement: '查询 2001-01-01 之后入学、且姓张的学生全部信息。',
      checks: ['entrancedate > 日期字面量', "studentname like '张%'", '用 and 组合条件'],
      answer: sqlQ2,
      starter: queryStarter,
    },
    {
      id: 'sql-3',
      mode: 'query',
      no: 3,
      title: '三表连接 + 排序',
      score: '查询题',
      fileName: '03-join.sql',
      engine: 'MySQL',
      requirement:
        '查询专业为「信息管理与信息系统」的男生，显示姓名、年龄、班级号、专业，按年龄升序。',
      checks: [
        'studentinfo、classinfo、majorinfo 三表连接',
        '连接条件 classid 与 majorid 都要写',
        'where 里加 major 与 studentsex 条件',
        'order by studentage asc',
      ],
      answer: sqlQ3,
      starter: queryStarter,
    },
    {
      id: 'sql-4',
      mode: 'query',
      no: 4,
      title: '子查询：低于本班平均分',
      score: '查询题',
      fileName: '04-subquery.sql',
      engine: 'MySQL',
      requirement: '查询 G0208 班中成绩低于本班平均分的学生姓名、年龄、成绩。',
      checks: [
        '外层 where 限制 classid',
        '内层 select avg(studentmark) 同班级',
        'studentmark < (子查询)',
      ],
      answer: sqlQ4,
      starter: queryStarter,
    },
    {
      id: 'sql-5',
      mode: 'query',
      no: 5,
      title: '分组 + having',
      score: '查询题',
      fileName: '05-group.sql',
      engine: 'MySQL',
      requirement: '统计成绩大于 90 分的学生人数超过 10 人的班级号与人数。',
      checks: ['where studentmark > 90', 'group by classid', 'having count(...) > 10'],
      answer: sqlQ5,
      starter: queryStarter,
    },
    {
      id: 'sql-6',
      mode: 'query',
      no: 6,
      title: 'update + 相关子查询',
      score: '更新题',
      fileName: '06-update.sql',
      engine: 'MySQL',
      requirement: '把 classinfo 的 classnumber 更新为该班在 studentinfo 中的实际人数。',
      checks: [
        'update 目标表与子查询表不同，可直接写',
        'set classnumber = (select count(1) ... where s.classid = c.classid)',
        '相关子查询条件不能漏',
      ],
      answer: sqlQ6,
      starter: queryStarter,
    },
    {
      id: 'sql-7',
      mode: 'query',
      no: 7,
      title: 'update + in 子查询',
      score: '更新题',
      fileName: '07-update-in.sql',
      engine: 'MySQL',
      requirement:
        '把专业为「信息管理与信息系统」且年龄大于 30 岁的学生成绩提高 2%。',
      checks: [
        'set studentmark = studentmark * 1.02',
        'where studentage > 30',
        'classid in (子查询拿到该专业的班级)',
      ],
      answer: sqlQ7,
      starter: queryStarter,
    },
    {
      id: 'sql-8',
      mode: 'query',
      no: 8,
      title: '行转列：及格与不及格人数',
      score: '查询题',
      fileName: '08-pivot.sql',
      engine: 'MySQL',
      requirement: '按性别统计及格（≥60）与不及格人数，一行显示性别、及格、不及格。',
      checks: [
        'group by studentsex',
        'sum(case when ... then 1 else 0 end) 或两个子查询 join',
        '列别名用中文或英文都行',
      ],
      answer: sqlQ8,
      starter: queryStarter,
    },
    {
      id: 'sql-9',
      mode: 'mysql',
      no: 9,
      title: '触发器：成绩超过 90 分不许修改',
      score: '编程题',
      fileName: '09-trigger-update.sql',
      engine: 'MySQL',
      requirement:
        '在 studentinfo 上建 before update 触发器：若原成绩大于 90，则拒绝修改并给出提示。',
      checks: [
        'before update on studentinfo for each row',
        '用 old.studentmark 判断原值',
        'signal sqlstate 抛错，message_text 给中文提示',
        'delimiter $$ 包裹，结束不要忘了还原 delimiter ;',
      ],
      answer: sqlQ9,
      starter: queryStarter,
    },
    {
      id: 'sql-10',
      mode: 'mysql',
      no: 10,
      title: '触发器：年龄小于 30 不许删除',
      score: '编程题',
      fileName: '10-trigger-delete.sql',
      engine: 'MySQL',
      requirement:
        '在 studentinfo 上建 before delete 触发器：若学生年龄小于 30，则拒绝删除。',
      checks: [
        'before delete on studentinfo for each row',
        '用 old.studentage 判断',
        'signal sqlstate 抛错 + message_text',
      ],
      answer: sqlQ10,
      starter: queryStarter,
    },
    {
      id: 'sql-11',
      mode: 'mysql',
      no: 11,
      title: '存储过程：按时间段查询',
      score: '编程题',
      fileName: '11-procedure.sql',
      engine: 'MySQL',
      requirement:
        '建立存储过程 p_studentinfo_get，传入开始与结束时间，查出该区间的学生并按入学时间排序。',
      checks: [
        'create procedure 名字(in beginTime datetime, in endTime datetime)',
        'begin ... end 体内 select ... where entrancedate between ? and ?',
        'order by entrancedate',
        '用 call 调用，delimiter $$',
      ],
      answer: sqlQ11,
      starter: queryStarter,
    },
    {
      id: 'sql-12',
      mode: 'mysql',
      no: 12,
      title: '存储函数：group_concat 拼接',
      score: '编程题',
      fileName: '12-function.sql',
      engine: 'MySQL',
      requirement:
        '建立存储函数 f_info_concat，传入班级号，返回该班「姓名(年龄)」拼接成的字符串，按年龄排序。',
      checks: [
        'create function 名字(vclassid char(5)) returns varchar(4096)',
        'reads sql data',
        'declare 变量 + select ... into',
        'group_concat(studentname, "(", studentage, ")")',
        '最后 return 变量',
      ],
      answer: sqlQ12,
      starter: queryStarter,
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

const mockStarterQuery = raw`-- 图书借阅库已就绪：book（7 种）、reader（5 人）、borrow（8 条借阅）
-- 直接写语句，点「运行」看结果

`;

const mockQ1 = raw`drop database if exists library;
create database library;
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

const mockQ2 = raw`select borrowid, readerid, borrowdate
from borrow
where borrowdate >= '2026-05-01'
  and returndate is null
order by borrowdate;`;

const mockQ3 = raw`select b.title, r.readername, br.borrowdate
from borrow br
join book b   on b.bookid = br.bookid
join reader r on r.readerid = br.readerid
order by br.borrowdate;`;

const mockQ4 = raw`select category as 分类,
       count(*) as 种数,
       sum(total) as 册数,
       round(avg(price), 2) as 均价
from book
group by category
having sum(total) >= 3
order by 册数 desc;`;

const mockQ5 = raw`select b.bookid, b.title, count(*) as 借阅次数
from book b
join borrow br on br.bookid = b.bookid
group by b.bookid, b.title
having count(*) > (select count(*) * 1.0 / (select count(*) from book) from borrow)
order by 借阅次数 desc, b.bookid;`;

const mockQ6 = raw`select *
from book b
where not exists (select 1 from borrow br where br.bookid = b.bookid);`;

const mockQ7 = raw`select bookid, title, category, price from book where category = '计算机'
union
select bookid, title, category, price from book where price >= 80
order by bookid;`;

const mockQ8 = raw`create view v_overdue as
select br.borrowid, b.title, r.readername, br.duedate
from borrow br
join book b   on b.bookid = br.bookid
join reader r on r.readerid = br.readerid
where br.returndate is null
  and br.duedate < '2026-10-25';

select * from v_overdue order by duedate;`;

const mockQ9 = raw`create index idx_borrow_book on borrow(bookid);`;

const mockQ10 = raw`update borrow
set duedate = date(duedate, '+30 day')
where returndate is null
  and borrowdate < '2026-10-01';

select borrowid, bookid, duedate, returndate from borrow order by borrowid;`;

const mockQ11 = raw`delimiter //
create trigger trg_borrow_limit
before insert on borrow
for each row
begin
  declare borrowed int;
  select count(*) into borrowed
    from borrow
   where bookid = new.bookid and returndate is null;
  if borrowed >= (select total from book where bookid = new.bookid) then
    signal sqlstate '45000' set message_text = '库存不足，不能借阅';
  end if;
end//
delimiter ;`;

const mockQ12 = raw`delimiter //
create procedure sp_reader_borrow_times(in p_reader int, out p_times int)
begin
  select count(*) into p_times from borrow where readerid = p_reader;
end//
delimiter ;

call sp_reader_borrow_times(1, @times);
select @times;`;

export const sqlMockSet: LabSet = {
  id: 'sql-mock-04736',
  name: '模拟卷',
  note: '按 04736 考纲（2019 修订）出的模拟卷：闭卷 1 小时，满分 100。数据是图书借阅库，可在页内直接跑。',
  questions: [
    {
      id: 'mock-1',
      mode: 'ddl',
      no: 1,
      title: '建库建表与完整性约束',
      score: '8 分',
      fileName: '01-ddl.sql',
      engine: 'MySQL',
      requirement:
        '建立 library 库，并按下面要求建三张表。book：bookid 主键，title 非空，price 必须大于 0，total 默认 1。reader：readerid 主键，readername 非空。borrow：borrowid 主键，borrowdate 非空，bookid 与 readerid 分别外键指向 book 和 reader，两个外键约束都要命名。',
      checks: [
        '主键：三张表各自声明',
        '非空：title、readername、borrowdate 加 not null',
        '检查约束：check (price > 0)',
        '默认值：total 加 default 1',
        '外键：constraint 名字 + references，两处都不能漏',
      ],
      answer: mockQ1,
      starter: mockStarterDdl,
    },
    {
      id: 'mock-2',
      mode: 'query',
      dataset: 'library',
      no: 2,
      title: '条件查询：日期比较与空值判断',
      score: '8 分',
      fileName: '02-select.sql',
      engine: 'MySQL',
      requirement: '查询 2026 年 5 月 1 日之后借出、且还没有归还的借阅记录，列出借阅号、读者号、借书日期，按借书日期升序。',
      checks: ['日期用字符串字面量比较', '未归还是 returndate is null，不能写 = null', 'order by 借书日期'],
      answer: mockQ2,
      starter: mockStarterQuery,
    },
    {
      id: 'mock-3',
      mode: 'query',
      dataset: 'library',
      no: 3,
      title: '连接查询：三张表连起来',
      score: '8 分',
      fileName: '03-join.sql',
      engine: 'MySQL',
      requirement: '列出每一条借阅记录的书名、借阅人姓名和借书日期，按借书日期升序。',
      checks: ['borrow 与 book 用 bookid 关联', 'borrow 与 reader 用 readerid 关联', 'join ... on 写全连接条件'],
      answer: mockQ3,
      starter: mockStarterQuery,
    },
    {
      id: 'mock-4',
      mode: 'query',
      dataset: 'library',
      no: 4,
      title: '分组聚合与 having',
      score: '8 分',
      fileName: '04-group.sql',
      engine: 'MySQL',
      requirement: '按分类统计图书的种数、总册数和平均单价（保留两位小数），只显示总册数不少于 3 册的分类，按总册数降序。',
      checks: ['group by category', 'count(*) 与 sum(total) 分开算', '筛选分组结果用 having，不能用 where', 'round(avg(price), 2)'],
      answer: mockQ4,
      starter: mockStarterQuery,
    },
    {
      id: 'mock-5',
      mode: 'query',
      dataset: 'library',
      no: 5,
      title: '子查询：高于平均借阅次数',
      score: '8 分',
      fileName: '05-subquery.sql',
      engine: 'MySQL',
      requirement: '找出借阅次数高于「全部图书平均借阅次数」的图书，列出图书号、书名和借阅次数。平均次数按「总借阅次数 / 图书总种数」计算。',
      checks: ['外层 group by 图书', 'having 里用子查询算平均', '子查询两个：总次数、图书种数'],
      answer: mockQ5,
      starter: mockStarterQuery,
    },
    {
      id: 'mock-6',
      mode: 'query',
      dataset: 'library',
      no: 6,
      title: '嵌套查询：从未被借过的书',
      score: '8 分',
      fileName: '06-not-exists.sql',
      engine: 'MySQL',
      requirement: '查询从来没有被借阅过的图书全部信息。',
      checks: ['not exists 子查询写法', '子查询里用 br.bookid = b.bookid 关联外层', "也可以写 bookid not in (select bookid from borrow)"],
      answer: mockQ6,
      starter: mockStarterQuery,
    },
    {
      id: 'mock-7',
      mode: 'query',
      dataset: 'library',
      no: 7,
      title: '联合查询：union 去重',
      score: '8 分',
      fileName: '07-union.sql',
      engine: 'MySQL',
      requirement: '查询「计算机」类图书，以及单价不低于 80 元的图书，两种条件的结果合并成一个结果集并去掉重复行，列出图书号、书名、分类、单价。',
      checks: ['两条 select 的列数和类型一致', 'union 自动去重，union all 不去重', 'order by 只能写在最后一条后面'],
      answer: mockQ7,
      starter: mockStarterQuery,
    },
    {
      id: 'mock-8',
      mode: 'query',
      dataset: 'library',
      no: 8,
      title: '视图：创建并查询',
      score: '8 分',
      fileName: '08-view.sql',
      engine: 'MySQL',
      requirement: "创建视图 v_overdue，列出截至 2026-10-25 仍未归还、且应还日期已过的借阅：借阅号、书名、借阅人姓名、应还日期。建完再查询这个视图。",
      checks: ['create view ... as select ...', '视图里的查询同样是三表连接', 'returndate is null and duedate < 日期'],
      answer: mockQ8,
      starter: mockStarterQuery,
    },
    {
      id: 'mock-9',
      mode: 'query',
      dataset: 'library',
      no: 9,
      title: '索引：建在连接列上',
      score: '8 分',
      fileName: '09-index.sql',
      engine: 'MySQL',
      requirement: 'borrow 表经常按 bookid 查借阅记录，为这一列建一个名为 idx_borrow_book 的普通索引。',
      checks: ['create index 索引名 on 表(列)', '索引列选在连接条件/查询条件上', 'MySQL 里用 show index from borrow 查看，删除用 drop index'],
      answer: mockQ9,
      starter: mockStarterQuery,
    },
    {
      id: 'mock-10',
      mode: 'query',
      dataset: 'library',
      no: 10,
      title: '数据更新：按条件改一批行',
      score: '8 分',
      fileName: '10-update.sql',
      engine: 'MySQL',
      requirement: '把 2026 年 10 月 1 日之前借出、且尚未归还的记录，应还日期统一顺延 30 天，改完查询借阅表确认结果。',
      checks: [
        'update ... set ... where ...，where 条件两个都要写',
        "SQLite 用 date(duedate, '+30 day')；MySQL 用 date_add(duedate, interval 30 day)",
        'update 之前先 select 看看会影响哪些行',
      ],
      answer: mockQ10,
      starter: mockStarterQuery,
    },
    {
      id: 'mock-11',
      mode: 'mysql',
      dataset: 'library',
      no: 11,
      title: '触发器：借书前的库存检查',
      score: '10 分',
      fileName: '11-trigger.sql',
      engine: 'MySQL',
      requirement:
        '给 borrow 表建一个 before insert 触发器 trg_borrow_limit：插入借阅记录时，如果这本书已借出未还的册数已经达到库存 total，就用 signal 报错「库存不足，不能借阅」，拒绝这次插入。',
      checks: [
        'delimiter // 与 delimiter ; 包住触发器体',
        'before insert on borrow for each row',
        'declare 局部变量 + select ... into 统计未归还册数',
        'if ... then signal sqlstate 结束语句',
        '这条是 MySQL 专属语法，页内跑不了，到真实 MySQL 里验证',
      ],
      answer: mockQ11,
      starter: mockStarterQuery,
    },
    {
      id: 'mock-12',
      mode: 'mysql',
      dataset: 'library',
      no: 12,
      title: '存储过程：带 in 与 out 参数',
      score: '10 分',
      fileName: '12-procedure.sql',
      engine: 'MySQL',
      requirement: '创建一个存储过程 sp_reader_borrow_times，输入读者号，输出该读者的借阅次数，然后用读者号 1 调用它并把结果查出来。',
      checks: [
        'create procedure 名字(in 参数, out 参数)',
        'begin ... end 里 select count(*) into 输出参数',
        'delimiter 切换不能漏',
        'call 时 out 参数传用户变量 @times',
        '页内跑不了，到真实 MySQL 里验证',
      ],
      answer: mockQ12,
      starter: mockStarterQuery,
    },
  ],
};

export default { javaSets, sqlSet, sqlMockSet };
