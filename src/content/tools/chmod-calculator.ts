import type { ToolContent } from "@/content/types";

export const chmodCalculatorContent: ToolContent = {
  howToUse: [
    "Type an octal mode such as 755 or 0644, or paste the permission string from ls -l such as drwxr-xr-x. The tool shows the other form, a plain-English summary of who can do what, and ready-to-copy chmod commands.",
    "Tick or untick the boxes in the grid to change individual read, write and execute bits for the owner, the group and everyone else. The input updates as you click, in the same form you typed it in.",
    "The setuid, setgid and sticky bits add a fourth leading digit to the octal mode. In ls -l output they replace the execute position with s or t, shown in uppercase when the execute bit underneath is not set.",
  ],
  examples: [
    {
      title: "A typical script or directory",
      note: "The owner can change it; everyone can read and run it.",
      input: "755",
      output: "rwxr-xr-x · chmod u=rwx,g=rx,o=rx file",
    },
    {
      title: "A private key or secrets file",
      note: "SSH refuses to use a private key that others can read.",
      input: "-rw-------",
      output: "600 · Owner: read, write · Group: no access · Others: no access",
    },
    {
      title: "A shared temporary directory",
      note: "Everyone can create files, but only a file's owner can delete it.",
      input: "drwxrwxrwt",
      output: "1777 · sticky bit set",
    },
  ],
  faq: [
    {
      question: "What does chmod 755 mean?",
      answer:
        "Each digit is the sum of read (4), write (2) and execute (1) for one class of user: the owner, the group, then everyone else. 7 = 4 + 2 + 1 gives the owner full access, and 5 = 4 + 1 lets the group and others read and execute but not write. In ls -l it appears as rwxr-xr-x.",
    },
    {
      question: "What is the difference between 644 and 755?",
      answer:
        "Both let only the owner write. 755 also sets the execute bit for everyone, which a script or binary needs in order to run and a directory needs so it can be entered. 644 is the usual mode for ordinary files such as documents, config files and web assets.",
    },
    {
      question: "What do s, S, t and T mean in ls -l output?",
      answer:
        "They mark the special bits. s in the owner or group execute position is setuid or setgid, and t in the others position is the sticky bit. Lowercase means the execute bit is also set; uppercase means it is not, which is usually a mistake for setuid and setgid.",
    },
    {
      question: "Should I ever use chmod 777?",
      answer:
        "Rarely. 777 lets every user on the system modify or replace the file, which on a server is a common route for one compromised service to tamper with another. If a process cannot read or write a file, fixing the owner or group with chown is usually the better answer.",
    },
    {
      question: "When should I use the symbolic chmod form instead of octal?",
      answer:
        "The two commands the tool shows give the same result. Symbolic modes such as u=rwx,g=rx,o=rx are easier to read in scripts and reviews, and chmod also accepts relative changes like g+w or o-r that adjust one bit while keeping the rest, which an octal mode cannot do.",
    },
  ],
};
