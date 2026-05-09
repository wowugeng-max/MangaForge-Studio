class NovelChapter(Base):
    __tablename__ = "novel_chapters"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("novel_projects.id"), nullable=False)
    outline_id = Column(Integer, ForeignKey("novel_outlines.id"), nullable=True)
    chapter_no = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    chapter_goal = Column(Text, default="")
    chapter_summary = Column(Text, default="")
    scene_list = Column(JSON, default=list)
    chapter_text = Column(Text, default="")
    conflict = Column(Text, default="")
    ending_hook = Column(Text, default="")
    status = Column(String(50), default="draft")
    version = Column(Integer, default=1)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("NovelProject", back_populates="chapters")
    versions = relationship("NovelChapterVersion", back_populates="chapter", cascade="all, delete-orphan")
